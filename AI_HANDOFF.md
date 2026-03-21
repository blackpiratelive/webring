# AI Handoff: WebSutra Webring

Purpose
Static site + serverless API for an India-focused webring. Users submit a site, receive a secret key + widget snippet, and verify placement. Member and admin dashboards exist. The DB is the single source of truth.

Repository Map
- Serverless API (DB-backed, primary):
  - api/join.js
  - api/verify.js
  - api/ring.js
  - api/members.js
  - api/manage.js
  - api/admin.js
  - api/latest.js
- Static UI (public/):
  - public/index.html (landing + join + directory)
  - public/dashboard.html (member dashboard)
  - public/admin.html (admin dashboard)
  - public/api-docs.html (API reference page)
  - public/widget.js (embed widget)
  - public/style.css
- Docs:
  - API_DOCS.md
  - public/api-docs.html
- Legacy/alternate assets:
  - netlify/functions/webring.js (deprecated)
  - members.txt (deprecated)
  - index.html.bak (older site)
  - success.html

Architecture Overview
1) DB-backed API (source of truth)
- Uses Turso/libSQL via @libsql/client.
- Web UI in public/index.html calls /api/* endpoints.
- Member dashboard uses /api/manage and /api/verify.
- Admin dashboard uses /api/admin.
- /api/ring handles next/prev/random and optional JSON responses.

2) Deprecated Netlify flow
- netlify/functions/webring.js reads members.txt.
- Kept only for legacy reference; no longer used by the widget.

Data Model (Inferred)
- users
  - id (pk)
  - secret_key (uuid)
  - email (nullable)
  - max_sites (int, default 2)
  - created_at (used in admin list)
- sites
  - id (pk)
  - user_id (fk users.id)
  - slug (unique)
  - url
  - title
  - status (pending | verified | suspended)

Critical Flows
Join (public/index.html -> api/join.js)
- POST { title, url, slug, email }
- Creates user + site, returns snippet + secretKey
- Optional Zapier webhook via ZAPIER_WEBHOOK_URL

Verification (public/dashboard.html -> api/verify.js)
- POST { slug }
- Fetches site homepage and verifies widget presence
- Updates site status to verified

Ring Navigation (api/ring.js)
- GET /api/ring?action=next|prev|random&slug=... (redirect)
- GET /api/ring?action=next|prev|random&url=...&json=true (JSON response)
- Passive verification when slug is provided and referer host matches

Member Dashboard (public/dashboard.html -> api/manage.js)
- action=login (returns user + sites)
- action=add_site
- action=update_profile (email update)
- action=update_site
- action=delete_site

Admin Dashboard (public/admin.html -> api/admin.js)
- action=list_all
- action=update_user
- action=delete_user
- action=update_site
- action=delete_site

Latest Sites API (api/latest.js)
- GET /api/latest
- Returns latest 10 verified sites (title + url)
- CORS enabled for external use

Config + Secrets
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- ADMIN_SECRET
- ZAPIER_WEBHOOK_URL (optional)

Operational Notes
- DB-backed API is the single source of truth.
- members.txt and netlify/functions/webring.js are deprecated and should not be used.
- public/widget.js uses /api/ring with url + json=true.
- /api/latest is cached (60s browser, 5m CDN, stale-while-revalidate 10m)

Known Sharp Edges
- Legacy Netlify flow is still present in the repo, but deprecated.

Suggested Next Steps
1) Remove deprecated Netlify files if no longer needed.
2) Add DB schema + migrations for Turso if you want reproducible setup.
