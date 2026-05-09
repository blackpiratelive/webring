import {
  SECRET_HASH_PREFIX,
  hashSecretKey,
  isSecretKeyHash,
} from '../lib/secret-hash.mjs';

const MIGRATION_ID = '2026-05-09_hash_user_secret_keys';
const REQUIRED_ENV = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'SECRET_HASH_PEPPER'];
const HASH_VALUE_PREFIX = `${SECRET_HASH_PREFIX}:`;

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name] || !process.env[name].trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function getCount(row) {
  return Number(row?.count ?? row?.COUNT ?? row?.['COUNT(*)'] ?? 0);
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function getUserColumns(tx) {
  const result = await tx.execute('PRAGMA table_info(users)');
  return new Set(result.rows.map((row) => String(row.name)));
}

function assertFinalSchema(columns) {
  if (!columns.has('secret_key_hash')) {
    throw new Error('users.secret_key_hash is missing after migration');
  }

  if (columns.has('secret_key')) {
    throw new Error('users.secret_key still exists after migration');
  }
}

async function migrationMarkerExists(tx) {
  const result = await tx.execute({
    sql: 'SELECT 1 FROM app_migrations WHERE id = ? LIMIT 1',
    args: [MIGRATION_ID],
  });
  return result.rows.length > 0;
}

async function ensureNoMissingHashes(tx) {
  const missing = await tx.execute(
    "SELECT COUNT(*) AS count FROM users WHERE secret_key_hash IS NULL OR trim(secret_key_hash) = ''"
  );

  if (getCount(missing.rows[0]) > 0) {
    throw new Error('One or more users are missing secret_key_hash');
  }
}

async function ensureHashesHaveExpectedFormat(tx) {
  const invalid = await tx.execute({
    sql: `SELECT id FROM users
          WHERE length(secret_key_hash) != ?
             OR substr(secret_key_hash, 1, ?) != ?
          LIMIT 1`,
    args: [HASH_VALUE_PREFIX.length + 64, HASH_VALUE_PREFIX.length, HASH_VALUE_PREFIX],
  });

  if (invalid.rows.length > 0) {
    throw new Error(`User ${invalid.rows[0].id} has an unexpected secret_key_hash format`);
  }
}

async function ensureNoDuplicateHashes(tx) {
  const duplicate = await tx.execute(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT secret_key_hash
       FROM users
       GROUP BY secret_key_hash
       HAVING COUNT(*) > 1
       LIMIT 1
     )`
  );

  if (getCount(duplicate.rows[0]) > 0) {
    throw new Error('Duplicate secret_key_hash values detected');
  }
}

async function backfillHashes(tx, columns) {
  const canReadPlaintext = columns.has('secret_key');
  const selectedColumns = canReadPlaintext ? 'id, secret_key, secret_key_hash' : 'id, secret_key_hash';
  const result = await tx.execute(`SELECT ${selectedColumns} FROM users`);
  let updatedCount = 0;

  for (const user of result.rows) {
    const existingHash = typeof user.secret_key_hash === 'string' ? user.secret_key_hash.trim() : '';
    if (existingHash) {
      if (!isSecretKeyHash(existingHash)) {
        throw new Error(`User ${user.id} has an unexpected secret_key_hash format`);
      }
      continue;
    }

    if (!canReadPlaintext) {
      throw new Error(`User ${user.id} cannot be migrated because users.secret_key is missing`);
    }

    const plaintextSecret = typeof user.secret_key === 'string' ? user.secret_key : '';
    const secretHash = hashSecretKey(plaintextSecret);

    await tx.execute({
      sql: 'UPDATE users SET secret_key_hash = ? WHERE id = ?',
      args: [secretHash, user.id],
    });
    updatedCount += 1;
  }

  return updatedCount;
}

async function dropSecretKeyIndexes(tx) {
  const indexes = await tx.execute('PRAGMA index_list(users)');

  for (const index of indexes.rows) {
    const indexName = String(index.name);
    const indexOrigin = String(index.origin ?? '');
    const indexedColumns = await tx.execute(`PRAGMA index_info(${quoteIdentifier(indexName)})`);
    const includesPlaintextSecret = indexedColumns.rows.some((column) => column.name === 'secret_key');

    if (!includesPlaintextSecret) {
      continue;
    }

    if (indexName.startsWith('sqlite_autoindex') || indexOrigin === 'u' || indexOrigin === 'pk') {
      throw new Error(
        'users.secret_key is part of an inline table constraint. Remove that constraint before this migration can drop the plaintext column.'
      );
    }

    await tx.execute(`DROP INDEX ${quoteIdentifier(indexName)}`);
  }
}

async function runMigration() {
  assertRequiredEnv();

  const { createClient } = await import('@libsql/client');
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  let tx;

  try {
    tx = await db.transaction('write');

    await tx.execute(
      'CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)'
    );

    const markerExists = await migrationMarkerExists(tx);
    let columns = await getUserColumns(tx);

    if (markerExists) {
      assertFinalSchema(columns);
      await tx.commit();
      console.log(`Secret hash migration ${MIGRATION_ID} already applied; skipping.`);
      return;
    }

    if (!columns.has('secret_key_hash')) {
      await tx.execute('ALTER TABLE users ADD COLUMN secret_key_hash TEXT');
      columns = await getUserColumns(tx);
    }

    const updatedCount = await backfillHashes(tx, columns);

    await ensureNoMissingHashes(tx);
    await ensureHashesHaveExpectedFormat(tx);
    await ensureNoDuplicateHashes(tx);

    await tx.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS users_secret_key_hash_unique ON users(secret_key_hash)'
    );

    if (columns.has('secret_key')) {
      await dropSecretKeyIndexes(tx);
      await tx.execute('ALTER TABLE users DROP COLUMN secret_key');
      columns = await getUserColumns(tx);
    }

    assertFinalSchema(columns);

    await tx.execute({
      sql: 'INSERT INTO app_migrations (id, applied_at) VALUES (?, ?)',
      args: [MIGRATION_ID, new Date().toISOString()],
    });

    await tx.commit();
    console.log(`Secret hash migration ${MIGRATION_ID} applied. Backfilled ${updatedCount} users.`);
  } catch (error) {
    try {
      if (tx && !tx.closed) {
        await tx.rollback();
      }
    } catch (rollbackError) {
      console.error('Secret hash migration rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    if (tx && !tx.closed) {
      tx.close();
    }
    db.close?.();
  }
}

runMigration().catch((error) => {
  console.error('Secret hash migration failed:', error.message);
  process.exitCode = 1;
});
