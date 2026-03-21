# API Docs

Base URL
- Production: https://webring.blackpiratex.com

Authentication
- None required for the public endpoints below.

Endpoints

GET /api/latest
Returns the latest 10 verified sites for external embeds.

Response (200)
```json
{
  "count": 10,
  "sites": [
    {
      "title": "Site Name",
      "url": "https://example.com/"
    }
  ]
}
```

Notes
- CORS: `Access-Control-Allow-Origin: *`
- Cache: `public, max-age=60, s-maxage=300, stale-while-revalidate=600`
- Only `status='verified'` sites are returned.

Example Usage
```js
fetch('https://webring.blackpiratex.com/api/latest')
  .then((res) => res.json())
  .then((data) => {
    data.sites.forEach((site) => {
      console.log(site.title, site.url);
    });
  });
```
