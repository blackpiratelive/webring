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
    // We use db.batch to send multiple SQL statements in ONE atomic HTTP request.
    // If any statement fails, the whole batch fails (Rollback is automatic).
    await db.batch([
        {
            // 1. Create User
            sql: "INSERT INTO users (secret_key, email) VALUES (?, ?)",
            args: [secretKey, email || null]
        },
        {
            // 2. Create Site
            // We use 'last_insert_rowid()' to grab the ID of the user we just created above.
            sql: "INSERT INTO sites (user_id, slug, url, title, status) VALUES (last_insert_rowid(), ?, ?, ?, ?)",
            args: [slug, url, title, 'pending']
        }
    ]);

    // --- Success! Generate Snippet ---
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
    console.error(error);
    // Check for "Unique constraint" error (Duplicate Slug)
    if (error.message && error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'ID (Slug) already taken. Please choose another.' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
}