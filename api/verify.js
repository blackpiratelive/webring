import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: "Missing Slug" });

  try {
    // 1. Get Site URL from DB
    const result = await db.execute({
        sql: "SELECT url, status FROM sites WHERE slug = ?",
        args: [slug]
    });
    
    const site = result.rows[0];
    if (!site) return res.status(404).json({ error: "Site not found" });

    // 2. Fetch their Homepage
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    const response = await fetch(site.url, { 
        signal: controller.signal,
        headers: { 
            'User-Agent': 'WebSutra-Bot/1.0 (Verifying Webring Membership)' 
        }
    });
    clearTimeout(timeout);

    if (!response.ok) {
        return res.status(400).json({ error: `Could not reach site. Status: ${response.status}` });
    }

    const html = await response.text();

    // 3. STRICT CHECK
    // We look for the specific ID of the container div OR the specific link.
    // This prevents false positives from just mentioning the name "WebSutra".
    const hasWidgetId = html.includes('id="websutra-ring"');
    const hasMainLink = html.includes('href="https://webring.blackpiratex.com"');

    if (hasWidgetId || hasMainLink) {
        await db.execute({
            sql: "UPDATE sites SET status = 'verified' WHERE slug = ?",
            args: [slug]
        });
        return res.status(200).json({ success: true, message: "Verification Successful!" });
    } else {
        return res.status(400).json({ error: "Widget code not found. Please ensure you pasted the HTML snippet correctly." });
    }

  } catch (error) {
    return res.status(500).json({ error: "Scan failed: " + error.message });
  }
}