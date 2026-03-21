import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

  try {
    const result = await db.execute({
      sql: "SELECT title, url FROM sites WHERE status = 'verified' ORDER BY id DESC LIMIT 10",
      args: []
    });

    return res.status(200).json({
      count: result.rows.length,
      sites: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch latest sites' });
  }
}
