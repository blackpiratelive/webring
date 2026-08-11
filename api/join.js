import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import { ensureStateColumn } from '../lib/db-init.mjs';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { title, url, slug, email, state } = req.body;
  if (!title || !url || !slug) return res.status(400).json({ error: 'Missing fields' });

  const secretKey = randomUUID();

  try {
    await ensureStateColumn(db);
    const { hashSecretKey } = await import('../lib/secret-hash.mjs');
    const secretKeyHash = hashSecretKey(secretKey);

    // 1. DATABASE TRANSACTION
    await db.batch([
        {
            sql: "INSERT INTO users (secret_key_hash, email) VALUES (?, ?)",
            args: [secretKeyHash, email || null]
        },
        {
            sql: "INSERT INTO sites (user_id, slug, url, title, status, state) VALUES (last_insert_rowid(), ?, ?, ?, ?, ?)",
            args: [slug, url, title, 'pending', state || null]
        }
    ]);

    // 2. ZAPIER TRIGGER
    if (process.env.ZAPIER_WEBHOOK_URL) {
        try {
            await fetch(process.env.ZAPIER_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'New Webring Member',
                    site_name: title,
                    website_url: url,
                    site_slug: slug,
                    user_email: email || "Not provided",
                    state: state || "Not provided",
                    timestamp: new Date().toISOString()
                })
            });
        } catch (webhookError) {
            console.error("Zapier Failed:", webhookError);
        }
    }

    // 3. RETURN SUCCESS
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
        return res.status(409).json({ error: 'ID (Slug) already taken.' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
}
