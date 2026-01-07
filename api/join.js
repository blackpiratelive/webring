import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { title, url, slug, email } = req.body;
  if (!title || !url || !slug) return res.status(400).json({ error: 'Missing fields' });

  const secretKey = randomUUID(); // The User's Master Password

  try {
    // Transaction-like logic: Create User -> Get ID -> Create Site
    await db.execute("BEGIN TRANSACTION");

    // 1. Create User
    const userResult = await db.execute({
        sql: "INSERT INTO users (secret_key, email) VALUES (?, ?) RETURNING id",
        args: [secretKey, email || null]
    });
    
    // Get the ID of the new user
    // Note: Turso/LibSQL returns inserted ID differently sometimes, ensuring we catch it.
    const userId = userResult.rows[0].id || userResult.lastInsertRowid;

    // 2. Create Site linked to that User
    await db.execute({
        sql: "INSERT INTO sites (user_id, slug, url, title, status) VALUES (?, ?, ?, ?, ?)",
        args: [userId, slug, url, title, 'pending']
    });

    await db.execute("COMMIT");

    // 3. Generate Snippet (Same as before)
    const host = req.headers.host; 
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    const snippet = `
<div id="websutra-ring">
  <p>Member of <a href="${baseUrl}">WebSutra</a></p>
  <a href="${baseUrl}/api/ring?action=prev&slug=${slug}">← Prev</a>
  <a href="${baseUrl}/api/ring?action=random">Random</a>
  <a href="${baseUrl}/api/ring?action=next&slug=${slug}">Next →</a>
</div>`;

    res.status(200).json({ success: true, snippet, secretKey });

  } catch (error) {
    await db.execute("ROLLBACK"); // Undo if site creation fails
    console.error(error);
    if (error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'ID/Slug already taken.' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
}