// api/verify.js
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Security: Only allow this to be run by you (optional, but recommended)
  // You can pass ?secret=YOUR_SECRET_PASSWORD in the URL
  const { slug, secret } = req.query;
  
  if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  if (!slug) return res.status(400).json({ error: "Missing slug" });

  try {
    // 1. Get the site info
    const result = await db.execute({
        sql: 'SELECT url, status FROM sites WHERE slug = ?',
        args: [slug]
    });
    
    const site = result.rows[0];
    if (!site) return res.status(404).json({ error: "Site not found" });

    // 2. Fetch their website HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(site.url, {
        signal: controller.signal,
        headers: {
            // Pretend to be a real browser
            'User-Agent': 'Mozilla/5.0 (compatible; WebSutraBot/1.0; +https://websutra.in)' 
        }
    });
    clearTimeout(timeout);

    if (!response.ok) {
        return res.status(400).json({ verified: false, reason: "Site unreachable (404/500)" });
    }

    const html = await response.text();

    // 3. Check for your link
    // We look for your domain. We don't check the exact code block because
    // users might change formatting.
    const isVerified = html.includes('websutra.in') || html.includes('websutra-ring');

    if (isVerified) {
        // 4. Update Status in DB
        await db.execute({
            sql: "UPDATE sites SET status = 'verified' WHERE slug = ?",
            args: [slug]
        });
        return res.json({ verified: true, slug: slug, url: site.url });
    } else {
        return res.json({ verified: false, reason: "Widget code not found in HTML" });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}