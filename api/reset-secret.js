import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import { hashSecretKey } from '../lib/secret-hash.mjs';
import {
  ensureSecretResetTable,
  hashSecretResetToken,
} from '../lib/secret-reset-tokens.mjs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing reset token' });
  }

  try {
    await ensureSecretResetTable(db);

    const tokenHash = hashSecretResetToken(token);
    const now = new Date().toISOString();
    const newSecretKey = randomUUID();
    const newSecretKeyHash = hashSecretKey(newSecretKey);
    const tx = await db.transaction('write');

    try {
      const tokenRes = await tx.execute({
        sql: `SELECT rt.id, rt.user_id
              FROM secret_reset_tokens rt
              JOIN users u ON u.id = rt.user_id
              WHERE rt.token_hash = ?
                AND rt.used_at IS NULL
                AND rt.expires_at > ?
              LIMIT 1`,
        args: [tokenHash, now],
      });

      const resetToken = tokenRes.rows[0];
      if (!resetToken) {
        await tx.rollback();
        return res.status(403).json({ error: 'Invalid or expired reset link' });
      }

      await tx.execute({
        sql: 'UPDATE users SET secret_key_hash = ? WHERE id = ?',
        args: [newSecretKeyHash, resetToken.user_id],
      });

      await tx.execute({
        sql: `UPDATE secret_reset_tokens
              SET used_at = ?
              WHERE user_id = ? AND used_at IS NULL`,
        args: [now, resetToken.user_id],
      });

      await tx.commit();
      return res.status(200).json({ success: true, secretKey: newSecretKey });
    } catch (error) {
      if (!tx.closed) {
        await tx.rollback();
      }
      throw error;
    } finally {
      if (!tx.closed) {
        tx.close();
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not reset secret key' });
  }
}
