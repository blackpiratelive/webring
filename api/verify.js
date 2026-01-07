import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Only allow POST (triggered by button click)
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
    // We use an AbortController to timeout after 5 seconds so your server doesn't hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); 

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

    // 3. Scan HTML for your domain
    // We check for 'webring.blackpiratex.com' OR 'websutra' just to be safe
    const isVerified = html.includes('webring.blackpiratex.com') || html.includes('websutra');

    if (isVerified) {
        await db.execute({
            sql: "UPDATE sites SET status = 'verified' WHERE slug = ?",
            args: [slug]
        });
        return res.status(200).json({ success: true, message: "Verification Successful!" });
    } else {
        return res.status(400).json({ error: "Widget code not found on your homepage. Please ensure you added the HTML." });
    }

  } catch (error) {
    return res.status(500).json({ error: "Scan failed: " + error.message });
  }
}