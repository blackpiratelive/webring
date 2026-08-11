import { createClient } from '@libsql/client';
import { ensureStateColumn } from '../lib/db-init.mjs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const USER_COLUMNS = 'id, email, max_sites, created_at';
const QUALIFIED_USER_COLUMNS = USER_COLUMNS.split(', ').map((column) => `u.${column}`).join(', ');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { key, targetSlug, action, siteId, newTitle, newUrl, newSlug, newStatus, newState, state, newLimit, newEmail } = req.body;

  if (!key) return res.status(401).json({ error: "Missing Key" });

  try {
    await ensureStateColumn(db);

    const isAdmin = key === process.env.ADMIN_SECRET;
    let user;

    // --- 1. AUTHENTICATION & USER FETCHING ---
    if (isAdmin) {
        if (!targetSlug) return res.status(400).json({ error: "Admin must provide a Target Slug to find the user" });
        
        const userRes = await db.execute({
            sql: `SELECT ${QUALIFIED_USER_COLUMNS} FROM users u 
                  JOIN sites s ON s.user_id = u.id 
                  WHERE s.slug = ?`,
            args: [targetSlug]
        });
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User/Site not found" });
        user = userRes.rows[0];
    } else {
        const { hashSecretKey } = await import('../lib/secret-hash.mjs');
        const secretKeyHash = hashSecretKey(key);
        const userRes = await db.execute({
            sql: `SELECT ${USER_COLUMNS} FROM users WHERE secret_key_hash = ?`,
            args: [secretKeyHash]
        });
        if (userRes.rows.length === 0) return res.status(403).json({ error: "Invalid Secret Key" });
        user = userRes.rows[0];
    }

    // --- 2. GET SITES ---
    const sitesRes = await db.execute({
        sql: "SELECT * FROM sites WHERE user_id = ?",
        args: [user.id]
    });
    const sites = sitesRes.rows;

    // --- 3. HANDLE ACTIONS ---

    if (action === 'login') {
        return res.json({ success: true, user, sites, isAdmin });
    }

    if (action === 'add_site') {
        if (sites.length >= user.max_sites && !isAdmin) {
            return res.status(403).json({ error: `Limit reached. You can only have ${user.max_sites} sites.` });
        }
        
        if (!newTitle || !newUrl || !newSlug) return res.status(400).json({ error: "Missing fields" });

        const selectedState = newState !== undefined ? newState : (state !== undefined ? state : null);

        await db.execute({
            sql: "INSERT INTO sites (user_id, slug, url, title, status, state) VALUES (?, ?, ?, ?, ?, ?)",
            args: [user.id, newSlug, newUrl, newTitle, 'pending', selectedState || null]
        });
        return res.json({ success: true, message: "Site added!" });
    }

    if (action === 'update_profile') {
        await db.execute({
            sql: "UPDATE users SET email = ? WHERE id = ?",
            args: [newEmail || null, user.id]
        });
        return res.json({ success: true, message: "Profile updated." });
    }

    if (action === 'update_site') {
        if (!siteId) return res.status(400).json({ error: "Missing Site ID" });
        
        const selectedState = newState !== undefined ? newState : (state !== undefined ? state : null);

        let sql = "UPDATE sites SET title = ?, url = ?, state = ? WHERE id = ? AND user_id = ?";
        let args = [newTitle, newUrl, selectedState || null, siteId, user.id];

        if (isAdmin && newStatus) {
            sql = "UPDATE sites SET title = ?, url = ?, status = ?, state = ? WHERE id = ? AND user_id = ?";
            args = [newTitle, newUrl, newStatus, selectedState || null, siteId, user.id];
        }

        await db.execute({ sql, args });
        return res.json({ success: true, message: "Updated." });
    }

    if (action === 'delete_site') {
        await db.execute({
            sql: "DELETE FROM sites WHERE id = ? AND user_id = ?",
            args: [siteId, user.id]
        });
        return res.json({ success: true, message: "Deleted." });
    }

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
