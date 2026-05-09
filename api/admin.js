import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const USER_COLUMNS = 'id, email, max_sites, created_at';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { key, action, userId, siteId, data } = req.body;
  const adminSecret = process.env.ADMIN_SECRET ? process.env.ADMIN_SECRET.trim() : '';

  // 1. SECURITY CHECK
  if (!adminSecret) {
    return res.status(500).json({ error: "ADMIN_SECRET is not configured" });
  }

  if (typeof key !== 'string' || key.trim() !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // --- LIST ALL (Users + Sites) ---
    if (action === 'list_all') {
      // Fetch Users
      const usersRes = await db.execute(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`);
      const users = usersRes.rows;

      // Fetch Sites
      const sitesRes = await db.execute("SELECT * FROM sites");
      const sites = sitesRes.rows;

      // Combine them in JavaScript
      const fullList = users.map(user => {
        return {
          ...user,
          sites: sites.filter(site => site.user_id === user.id)
        };
      });

      return res.json({ success: true, data: fullList });
    }

    // --- UPDATE USER ---
    if (action === 'update_user') {
      await db.execute({
        sql: "UPDATE users SET email = ?, max_sites = ? WHERE id = ?",
        args: [data.email, data.max_sites, userId]
      });
      return res.json({ success: true });
    }

    // --- CREATE SECRET RESET LINK ---
    if (action === 'create_secret_reset_link') {
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const {
        createSecretResetToken,
        ensureSecretResetTable,
        getBaseUrl,
        getSecretResetExpiry,
        hashSecretResetToken,
      } = await import('../lib/secret-reset-tokens.mjs');

      const userRes = await db.execute({
        sql: "SELECT id FROM users WHERE id = ?",
        args: [userId]
      });
      if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

      await ensureSecretResetTable(db);

      const token = createSecretResetToken();
      const tokenHash = hashSecretResetToken(token);
      const now = new Date().toISOString();
      const expiresAt = getSecretResetExpiry();

      await db.batch([
        {
          sql: "UPDATE secret_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
          args: [now, userId]
        },
        {
          sql: "INSERT INTO secret_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
          args: [userId, tokenHash, expiresAt]
        }
      ]);

      const resetLink = `${getBaseUrl(req)}/reset-secret.html?token=${encodeURIComponent(token)}`;
      return res.json({ success: true, resetLink, expiresAt });
    }

    // --- DELETE USER (Cascades to sites usually, but we ensure it) ---
    if (action === 'delete_user') {
      // Delete sites first (manual cascade if DB doesn't support it)
      const { ensureSecretResetTable } = await import('../lib/secret-reset-tokens.mjs');
      await ensureSecretResetTable(db);
      await db.execute({
        sql: "UPDATE secret_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
        args: [new Date().toISOString(), userId]
      });
      await db.execute({ sql: "DELETE FROM sites WHERE user_id = ?", args: [userId] });
      await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
      return res.json({ success: true });
    }

    // --- UPDATE SITE ---
    if (action === 'update_site') {
      await db.execute({
        sql: "UPDATE sites SET title = ?, url = ?, slug = ?, status = ? WHERE id = ?",
        args: [data.title, data.url, data.slug, data.status, siteId]
      });
      return res.json({ success: true });
    }

    // --- DELETE SITE ---
    if (action === 'delete_site') {
      await db.execute({ sql: "DELETE FROM sites WHERE id = ?", args: [siteId] });
      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Unknown Action" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
