# AI Handoff: WebSutra Webring

## Purpose
WebSutra is a static site + serverless API for an India-focused webring & directory celebrating handmade personal homepages, indie blogs, and webmasters. Users submit a site, receive a secret key + widget snippet, and verify placement. Member and admin dashboards exist. The DB is the single source of truth.

---

## Repository Map
- **Serverless API (DB-backed, primary)**:
  - `api/join.js` - Handles site registration, password hashing, and widget snippet generation.
  - `api/verify.js` - Scrapes member site to verify WebSutra widget code placement.
  - `api/ring.js` - Handles next/prev/random redirects and JSON responses.
  - `api/members.js` - Returns verified and pending webring members with member_days.
  - `api/manage.js` - Member dashboard CRUD API (login, add_site, update, delete).
  - `api/admin.js` - Super admin API (list all, reset links, user/site management).
  - `api/reset-secret.js` - One-time secret reset consumption.
  - `api/latest.js` - Cached API endpoint returning 10 latest verified sites.
- **Static UI (`public/`)**:
  - `public/index.html` - **Primary Full-Screen Interactive Map Viewport** (Google Maps style pan/zoom, constellation background, `?` FAB button, slide-out info drawer).
  - `public/demo.html` - **Traditional Scrolling Homepage** (About WebSutra, inline map, Member Gallery, and Members Directory table).
  - `public/join.html` - Dedicated Webring registration page with secret key generator and snippet output.
  - `public/dashboard.html` - Member login & site management dashboard.
  - `public/admin.html` - Super admin dashboard.
  - `public/reset-secret.html` - One-time secret reset page.
  - `public/api-docs.html` - Interactive API documentation.
  - `public/widget.js` - Embeddable webring widget script.
  - `public/style.css` - Authentic retro Web 1.0 design system (`VT323` pixel headings, `Courier Prime` monospace, 3D bevel buttons, per-state neon glows).
  - `public/graphics/` - Retro GIFs (`flag.gif`, `divider-blood.gif`, `email-me.gif`, `join-now.gif`), badge (`websutra-badge.jpg`), and `states.svg`.
  - `public/india.png` - India map graphic used in About sections.
- **Docs**:
  - `AI_HANDOFF.md`
  - `API_DOCS.md`
  - `public/api-docs.html`

---

## Architecture Overview
1. **DB-backed API (Source of Truth)**:
   - Built on Turso / libSQL (`@libsql/client`).
   - Web UI in `public/index.html`, `public/demo.html`, and `public/join.html` interact with `/api/*` endpoints.
   - Secret key hashes use HMAC-SHA256 with a pepper (`SECRET_HASH_PEPPER`).

2. **Full-Screen Interactive Map & Navigation System**:
   - `public/index.html` serves as a full-viewport (`100vw` × `100vh`) interactive map.
   - Features **Google Maps-Style Pan & Zoom Engine**: mouse wheel zoom, mouse drag pan, mobile touch pinch-to-zoom, touch drag pan, and `[ + ]` / `[ − ]` / `[ 🎯 ]` control stack.
   - Features **60 FPS HTML5 Canvas Constellation Background** (`#constellations-bg`) rendering star nodes and connecting cyan lines.
   - Floating `?` FAB button opens a slide-over modal drawer containing `About`, `Join`, `Directory`, `Gallery`, `FAQ`, `Manifesto`, `Guidelines`, `Privacy`, and `Login`.

3. **Data Model**:
   - `users`: `id`, `secret_key_hash`, `email`, `max_sites`, `created_at`.
   - `sites`: `id`, `user_id`, `slug` (unique), `url`, `title`, `status` (`pending` | `verified` | `suspended`).
   - `secret_reset_tokens`: `user_id`, `token_hash`, `expires_at`, `used_at`.

---

## Critical Workflows & Operations
- **Join**: `POST /api/join` { title, url, slug, email } &rarr; returns `secretKey` (shown once) + widget HTML snippet.
- **Verification**: `POST /api/verify` { slug } &rarr; scrapes site homepage HTML for `api/ring` widget URL.
- **Ring Navigation**: `GET /api/ring?action=next|prev|random&slug=...` &rarr; redirects to next verified site.
- **Member Dashboard**: Login via raw secret token &rarr; `POST /api/manage` { action: 'login', secretKey }.

---

## Environment Variables & Config
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `ADMIN_SECRET`
- `SECRET_HASH_PEPPER` (Must remain fixed; changing invalidates member logins)
- `ZAPIER_WEBHOOK_URL` (Optional)

---

## Recent Accomplishments
- **Interactive SVG Map & Unified Popups**: Inlined `states.svg` (36 states/UTs with `id="State Name"`) with per-state vibrant neon hover colors, HUD target overlay, and unified modal popups.
- **Full-Screen Map Viewport**: Redesigned `index.html` into a full-screen Google Maps-style canvas with mouse wheel zoom, drag pan, touch pinch-to-zoom, and zoom UI buttons.
- **Constellation Canvas Background**: Implemented 60 FPS HTML5 Canvas constellation background for maximum rendering speed.
- **Dedicated Join Page**: Created `public/join.html` with clean form fields and secret key output.
- **Clean Retro Webmaster Design System**: Standardized `style.css` with 3D bevel retro buttons, `VT323` pixel headers, and dark slate backgrounds (`#05070e`).
