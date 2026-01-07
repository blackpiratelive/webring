// api/ring.js
import { createClient } from '@libsql/client';

// 1. Initialize DB Connection
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // We expect calls like: /api/ring?action=next&slug=rohit-blog
  const { action, slug } = req.query; 
  const referer = req.headers.referer || ""; // Where is the user coming from?

  try {
    // --- PART A: CLEVER VERIFICATION ---
    // We check if the request actually came from the site owner's URL.
    if (slug) {
      // 1. Fetch only the specific site sending the user
      const currentSiteResult = await db.execute({
        sql: "SELECT url, status FROM sites WHERE slug = ?",
        args: [slug]
      });

      const currentSite = currentSiteResult.rows[0];

      if (currentSite) {
        // 2. Check if the Referer matches their registered URL
        // We use .includes() to handle subpages (e.g. rohit.me/blog/post-1)
        const isLegitTraffic = referer.includes(currentSite.url.replace(/\/$/, "")); 

        // 3. If legit and not yet verified, verify them instantly!
        if (isLegitTraffic && currentSite.status === 'pending') {
          await db.execute({
            sql: "UPDATE sites SET status = 'verified' WHERE slug = ?",
            args: [slug]
          });
          console.log(`Verified ${slug} via passive traffic check!`);
        }
      }
    }

    // --- PART B: THE ROUTING LOGIC ---
    
    // 1. Get ALL sites to calculate the ring
    // Optional: Add "WHERE status != 'suspended'" to hide banned sites
    const allSitesResult = await db.execute('SELECT slug, url FROM sites ORDER BY id ASC');
    const sites = allSitesResult.rows;

    // Fallback if DB is empty
    if (!sites.length) {
      return res.redirect('https://your-main-websutra-site.com');
    }

    let targetUrl = 'https://your-main-websutra-site.com';

    // 2. Handle "Random" (Does not require a slug)
    if (action === 'random') {
      const randomSite = sites[Math.floor(Math.random() * sites.length)];
      return res.redirect(randomSite.url);
    }

    // 3. Handle Next/Prev
    const currentIndex = sites.findIndex((s) => s.slug === slug);

    if (currentIndex === -1) {
      // If slug is wrong/missing, just send them to the start of the ring
      targetUrl = sites[0].url;
    } else {
      let nextIndex = 0;
      
      if (action === 'next') {
        // Modulo operator (%) makes it loop back to 0 automatically
        nextIndex = (currentIndex + 1) % sites.length;
      } else if (action === 'prev') {
        // Adding length before modulo handles negative numbers correctly
        nextIndex = (currentIndex - 1 + sites.length) % sites.length;
      }
      
      targetUrl = sites[nextIndex].url;
    }

    // 4. Send them on their way
    // 302 means "Temporary Redirect" (Good for not caching the route)
    res.redirect(302, targetUrl);

  } catch (error) {
    console.error("Ring Error:", error);
    // Always fail safe to your homepage so users aren't stranded
    res.redirect('https://webring.blackpiratex.com');
  }
}