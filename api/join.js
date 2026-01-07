import { createClient } from '@libsql/client';

// 1. Initialize Database Client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, url, slug, email } = req.body;

  // Basic validation
  if (!title || !url || !slug) {
    return res.status(400).json({ error: 'Title, URL, and Slug are required' });
  }

  try {
    // 2. Insert into Turso Database
    // We still save the email if provided (for your records), but we don't send anything.
    await db.execute({
      sql: 'INSERT INTO sites (title, url, slug, email) VALUES (?, ?, ?, ?)',
      args: [title, url, slug, email || null],
    });

    // 3. Generate the HTML Snippet
    const host = req.headers.host; 
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const snippet = `
<div id="websutra-ring" style="border:1px solid #333; padding:10px; max-width: 300px; font-family: sans-serif; text-align: center; background: #121212; color: #e0e0e0; border-radius: 4px;">
  <p style="margin: 0 0 10px 0; font-size: 0.9rem;">
    Member of the <a href="${baseUrl}" style="color: #ff8c42; text-decoration: none;">WebSutra Ring</a>
  </p>
  <div style="display: flex; justify-content: space-between; gap: 10px;">
    <a href="${baseUrl}/api/ring?action=prev&slug=${slug}" style="color: #ff8c42; text-decoration: none;">&larr; Prev</a>
    <a href="${baseUrl}/api/ring?action=random" style="color: #ff8c42; text-decoration: none;">Random</a>
    <a href="${baseUrl}/api/ring?action=next&slug=${slug}" style="color: #ff8c42; text-decoration: none;">Next &rarr;</a>
  </div>
</div>
`;

    // 4. Success Response
    res.status(200).json({ success: true, snippet });

  } catch (error) {
    console.error("Join API Error:", error);

    // Check for unique constraint violation (Duplicate Slug)
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'This Slug (ID) is already taken. Please choose another.' });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
}