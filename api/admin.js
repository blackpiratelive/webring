import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { key, action, userId, siteId, data } = req.body;

  // 1. SECURITY CHECK
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // --- LIST ALL (Users + Sites) ---
    if (action === 'list_all') {
      // Fetch Users
      const usersRes = await db.execute("SELECT * FROM users ORDER BY created_at DESC");
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

    // --- DELETE USER (Cascades to sites usually, but we ensure it) ---
    if (action === 'delete_user') {
      // Delete sites first (manual cascade if DB doesn't support it)
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