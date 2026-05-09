import { randomBytes } from 'crypto';
import { hashSecretKey } from './secret-hash.mjs';

export const SECRET_RESET_TTL_HOURS = 72;

export function createSecretResetToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSecretResetToken(token) {
  return hashSecretKey(token);
}

export function getSecretResetExpiry(now = new Date()) {
  return new Date(now.getTime() + SECRET_RESET_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function getBaseUrl(req) {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
}

export async function ensureSecretResetTable(db) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS secret_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await db.execute(
    'CREATE INDEX IF NOT EXISTS secret_reset_tokens_user_id_idx ON secret_reset_tokens(user_id)'
  );
}
