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

  const secretKey = randomUUID();

  try {
    // 1. DATABASE TRANSACTION (Add User & Site)
    await db.batch([
        {
            sql: "INSERT INTO users (secret_key, email) VALUES (?, ?)",
            args: [secretKey, email || null]
        },
        {
            sql: "INSERT INTO sites (user_id, slug, url, title, status) VALUES (last_insert_rowid(), ?, ?, ?, ?)",
            args: [slug, url, title, 'pending']
        }
    ]);

    // 2. ZAPIER TRIGGER (Outgoing Webhook)
    // We send this *after* the DB insert succeeds.
    if (process.env.ZAPIER_WEBHOOK_URL) {
        console.log("Triggering Zapier...");
        
        // We do NOT await this. We want to return the response to the user 
        // immediately without waiting for Zapier to finish.
        fetch(process.env.ZAPIER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'New Webring Member',
                site_name: title,      // Name requested
                website_url: url,      // URL requested
                site_slug: slug,
                user_email: email || "Not provided",
                timestamp: new Date().toISOString()
            })
        }).catch(err => console.error("Zapier Webhook Failed:", err));
    }

    // 3. GENERATE SNIPPET & RETURN SUCCESS
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
    if (error.message && error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'ID (Slug) already taken. Please choose another.' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
}