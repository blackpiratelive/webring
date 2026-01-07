import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // "targetSlug" is used by Admin to find a user. "key" is used by everyone to login.
  const { key, targetSlug, action, siteId, newTitle, newUrl, newSlug, newStatus, newLimit } = req.body;

  if (!key) return res.status(401).json({ error: "Missing Key" });

  try {
    const isAdmin = key === process.env.ADMIN_SECRET;
    let user;

    // --- 1. AUTHENTICATION & USER FETCHING ---
    if (isAdmin) {
        if (!targetSlug) return res.status(400).json({ error: "Admin must provide a Target Slug to find the user" });
        
        // Find user via one of their sites
        const userRes = await db.execute({
            sql: `SELECT u.* FROM users u 
                  JOIN sites s ON s.user_id = u.id 
                  WHERE s.slug = ?`,
            args: [targetSlug]
        });
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User/Site not found" });
        user = userRes.rows[0];
    } else {
        // Normal Login: Find user by Secret Key
        const userRes = await db.execute({
            sql: "SELECT * FROM users WHERE secret_key = ?",
            args: [key]
        });
        if (userRes.rows.length === 0) return res.status(403).json({ error: "Invalid Secret Key" });
        user = userRes.rows[0];
    }

    // --- 2. GET SITES ---
    // Always fetch sites to return them to dashboard
    const sitesRes = await db.execute({
        sql: "SELECT * FROM sites WHERE user_id = ?",
        args: [user.id]
    });
    const sites = sitesRes.rows;


    // --- 3. HANDLE ACTIONS ---

    // ACTION: LOGIN (Just return data)
    if (action === 'login') {
        return res.json({ success: true, user, sites, isAdmin });
    }

    // ACTION: ADD SITE (User wants to add 2nd site)
    if (action === 'add_site') {
        if (sites.length >= user.max_sites && !isAdmin) {
            return res.status(403).json({ error: `Limit reached. You can only have ${user.max_sites} sites.` });
        }
        
        if (!newTitle || !newUrl || !newSlug) return res.status(400).json({ error: "Missing fields" });

        await db.execute({
            sql: "INSERT INTO sites (user_id, slug, url, title, status) VALUES (?, ?, ?, ?, ?)",
            args: [user.id, newSlug, newUrl, newTitle, 'pending']
        });
        return res.json({ success: true, message: "Site added!" });
    }

    // ACTION: UPDATE SITE
    if (action === 'update_site') {
        if (!siteId) return res.status(400).json({ error: "Missing Site ID" });
        
        let sql = "UPDATE sites SET title = ?, url = ? WHERE id = ? AND user_id = ?";
        let args = [newTitle, newUrl, siteId, user.id];

        // Admin can update Status
        if (isAdmin && newStatus) {
            sql = "UPDATE sites SET title = ?, url = ?, status = ? WHERE id = ? AND user_id = ?";
            args = [newTitle, newUrl, newStatus, siteId, user.id];
        }

        await db.execute({ sql, args });
        return res.json({ success: true, message: "Updated." });
    }

    // ACTION: DELETE SITE
    if (action === 'delete_site') {
        await db.execute({
            sql: "DELETE FROM sites WHERE id = ? AND user_id = ?",
            args: [siteId, user.id]
        });
        return res.json({ success: true, message: "Deleted." });
    }

    // ACTION: UPDATE LIMIT (Admin Only)
    if (action === 'update_limit') {
        if (!isAdmin) return res.status(403).json({ error: "Unauthorized" });
        
        await db.execute({
            sql: "UPDATE users SET max_sites = ? WHERE id = ?",
            args: [newLimit, user.id]
        });
        return res.json({ success: true, message: "Limit updated." });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (e) {
    console.error(e);
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: "Slug already taken" });
    return res.status(500).json({ error: e.message });
  }
}