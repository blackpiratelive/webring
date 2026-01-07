// api/ring.js
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { action, slug } = req.query; 
  const referer = req.headers.referer || ""; 

  try {
    // --- PART A: CLEVER VERIFICATION ---
    if (slug) {
      const currentSiteResult = await db.execute({
        sql: "SELECT url, status FROM sites WHERE slug = ?",
        args: [slug]
      });

      const currentSite = currentSiteResult.rows[0];

      if (currentSite) {
        // DEBUG LOGGING: Check Vercel Function Logs to see these
        console.log(`Checking verification for: ${slug}`);
        console.log(`Registered URL: ${currentSite.url}`);
        console.log(`Incoming Referer: ${referer}`);

        // ROBUST COMPARISON LOGIC
        let isLegitTraffic = false;

        try {
          if (referer) {
            // Parse URLs to compare HOSTNAMES (ignores http vs https and trailing slashes)
            const refererUrl = new URL(referer);
            const storedUrl = new URL(currentSite.url);
            
            // Check if hostnames match (e.g. "google.com" === "google.com")
            // We also check if referer includes stored hostname to handle subdomains if desired
            if (refererUrl.hostname === storedUrl.hostname || refererUrl.hostname.endsWith(storedUrl.hostname)) {
                isLegitTraffic = true;
            }
          }
        } catch (e) {
          console.log("Error parsing URLs for verification", e);
        }

        if (isLegitTraffic && currentSite.status === 'pending') {
          await db.execute({
            sql: "UPDATE sites SET status = 'verified' WHERE slug = ?",
            args: [slug]
          });
          console.log(`SUCCESS: Verified ${slug} via passive traffic check!`);
        } else {
           console.log(`FAILED: Legit: ${isLegitTraffic}, Status: ${currentSite.status}`);
        }
      }
    }

    // --- PART B: ROUTING (Rest of your code remains same) ---
    const allSitesResult = await db.execute('SELECT slug, url FROM sites ORDER BY id ASC');
    const sites = allSitesResult.rows;

    if (!sites.length) return res.redirect('https://webring.blackpiratex.com');

    let targetUrl = 'https://webring.blackpiratex.com';

    if (action === 'random') {
      const randomSite = sites[Math.floor(Math.random() * sites.length)];
      return res.redirect(randomSite.url);
    }

    const currentIndex = sites.findIndex((s) => s.slug === slug);

    if (currentIndex === -1) {
      targetUrl = sites[0].url;
    } else {
      let nextIndex = 0;
      if (action === 'next') {
        nextIndex = (currentIndex + 1) % sites.length;
      } else if (action === 'prev') {
        nextIndex = (currentIndex - 1 + sites.length) % sites.length;
      }
      targetUrl = sites[nextIndex].url;
    }

    res.redirect(302, targetUrl);

  } catch (error) {
    console.error("Ring Error:", error);
    res.redirect('https://webring.blackpiratex.com');
  }
}