import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // 1. Force fresh data (No Caching)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  try {
    // 2. Select public site fields plus membership age from the owning user
    const result = await db.execute({
        sql: `SELECT
                s.title,
                s.url,
                s.slug,
                s.status,
                u.created_at AS member_since,
                CASE
                  WHEN u.created_at IS NULL THEN NULL
                  ELSE MAX(0, CAST(julianday('now') - julianday(u.created_at) AS INTEGER))
                END AS member_days
              FROM sites s
              LEFT JOIN users u ON u.id = s.user_id
              ORDER BY s.id DESC`,
        args: []
    });
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}
