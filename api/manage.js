import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { slug, key, action, newTitle, newUrl, newStatus } = req.body;

  if (!slug || !key) {
    return res.status(401).json({ error: "Missing Slug or Key" });
  }

  try {
    // --- 1. ADMIN CHECK ---
    // Check if the provided key matches your ADMIN_SECRET env var
    const isAdmin = key === process.env.ADMIN_SECRET;

    // --- 2. AUTHENTICATION ---
    let site;
    
    if (isAdmin) {
        // If Admin, just find the site by slug (ignore the site's actual secret key)
        const result = await db.execute({
            sql: "SELECT * FROM sites WHERE slug = ?",
            args: [slug]
        });
        if (result.rows.length === 0) return res.status(404).json({ error: "Site not found" });
        site = result.rows[0];
    } else {
        // Normal User: Must match Slug AND Secret Key
        const result = await db.execute({
            sql: "SELECT * FROM sites WHERE slug = ? AND secret_key = ?",
            args: [slug, key]
        });
        if (result.rows.length === 0) return res.status(403).json({ error: "Invalid credentials" });
        site = result.rows[0];
    }

    // --- 3. ACTIONS ---

    // LOGIN (View Data)
    if (action === 'login') {
        return res.status(200).json({ 
            success: true, 
            site: {
                title: site.title,
                url: site.url,
                slug: site.slug,
                status: site.status,
                // Only show email to Admin
                email: isAdmin ? site.email : undefined 
            },
            isAdmin // Tell frontend we are admin
        });
    }

    // UPDATE
    if (action === 'update') {
        // Admin can update Status, User cannot
        if (isAdmin && newStatus) {
            await db.execute({
                sql: "UPDATE sites SET title = ?, url = ?, status = ? WHERE slug = ?",
                args: [newTitle, newUrl, newStatus, slug]
            });
        } else {
            // Normal user update
            await db.execute({
                sql: "UPDATE sites SET title = ?, url = ? WHERE slug = ?",
                args: [newTitle, newUrl, slug]
            });
        }
        return res.status(200).json({ success: true, message: "Updated successfully" });
    }

    // DELETE
    if (action === 'delete') {
        await db.execute({
            sql: "DELETE FROM sites WHERE slug = ?",
            args: [slug]
        });
        return res.status(200).json({ success: true, message: "Deleted successfully" });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (error) {
    console.error("Manage API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}