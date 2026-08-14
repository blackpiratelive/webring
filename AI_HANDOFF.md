# AI Handoff: WebSutra Webring

## Purpose
WebSutra is a classic Web 1.0 directory and webring dedicated to celebrating Indian personal homepages, indie blogs, and passion websites. Users register their site, receive a Webmaster Secret Key + widget snippet, and verify link placement. Member and admin control panels exist. The DB is the single source of truth.

---

## Repository Map
- **Serverless API (DB-backed, primary)**:
  - `api/join.js` - Handles site registration (including optional state selection), password hashing, and widget snippet generation.
  - `api/verify.js` - Scrapes member site to verify WebSutra widget code placement.
  - `api/ring.js` - Handles next/prev/random redirects and JSON responses.
  - `api/members.js` - Returns verified and pending webring members with `member_days` and state.
  - `api/manage.js` - Member dashboard CRUD API (login, add_site, update, delete) with state field management.
  - `api/admin.js` - Super admin API (list all, reset links, user/site/state management).
  - `api/reset-secret.js` - One-time secret reset consumption.
  - `api/latest.js` - Cached API endpoint returning 10 latest verified sites.
- **Lib Helper Utilities (`lib/`)**:
  - `lib/db-init.mjs` - Exports `INDIAN_STATES` array and automatic DB schema initialization helper `ensureStateColumn(db)` to alter table schema automatically if needed.
  - `lib/secret-hash.mjs` - HMAC-SHA256 secret hashing algorithms.
  - `lib/secret-reset-tokens.mjs` - One-time secret reset token generation and consumption.
- **Static UI (`public/`)**:
  - `public/index.html` - **Webmaster Portal Homepage** (Top marquee, directory hero header banner, Web 1.0 navigation bar, Webring quick nav widget, statistics counter, 88x31 badges, interactive SVG India state directory map with dynamic state labels, 468x60 retro banner network, and recently verified webmasters table).
  - `public/widgets.html` - **Webring Widgets & Badges Catalog** (Embed code snippets, live previews, 88x31 badges, 468x60 pure CSS retro banner ad collection, `widget.js` script embeds, and step-by-step framework integration guides).
  - `public/members.html` - **Registered Webmasters Directory Index** (Searchable directory roster, state filters, grid card and table view toggles).
  - `public/join.html` - **Site Registration Desk** with optional Indian State dropdown, secret key generator, and snippet output.
  - `public/dashboard.html` - **Webmaster Control Panel** for login, site CRUD management, and widget verification.
  - `public/admin.html` - **Super Admin Console** with full user, site, and state management capabilities.
  - `public/reset-secret.html` - **Key Recovery Desk** for one-time secret key resets.
  - `public/api-docs.html` - **REST API Reference** page.
  - `public/demo.html` - **Traditional Directory View** (About WebSutra, inline map with state text labels, and webmaster directory).
  - `public/widget.js` - Embeddable webring widget script with scoped CSS isolation.
  - `public/style.css` - **Early 2000s Web Directory Design System (Yahoo! / DMOZ Aesthetic)** (Light off-white background `#f4f6f9`, steel blue headers `#003366`, slate borders `#7a92a5`, Verdana typography, classic blue/purple link colors, retro status pills, state label text overlay rules, 468x60 banner keyframe animations).
  - `public/graphics/` - Retro GIFs (`flag.gif`, `email-me.gif`, `join-now.gif`), badge (`websutra-badge.jpg`), `states.svg`, and local SVG fallback `states.js`.
  - `public/india.png` - India map graphic used in About sections.
- **Docs**:
  - `AI_HANDOFF.md`
  - `API_DOCS.md`
  - `public/api-docs.html`

---

## Architecture Overview
1. **DB-backed API (Source of Truth)**:
   - Built on Turso / libSQL (`@libsql/client`).
   - Web UI in `public/index.html`, `public/widgets.html`, `public/members.html`, `public/join.html`, etc. interact with `/api/*` endpoints.
   - Automatic DB schema initialization (`ensureStateColumn` in `lib/db-init.mjs`) automatically adds `state` column to `sites` table on request.
   - Secret key hashes use HMAC-SHA256 with a pepper (`SECRET_HASH_PEPPER`).

2. **Early 2000s Web Directory Design System (Yahoo! / DMOZ Style)**:
   - Clean, lightweight 2-column portal layout (`.portal-container`) with top marquee banner, hero header, and navigation bar.
   - Soft directory palette (`#f4f6f9` background, `#ffffff` card panels, `#003366` steel blue headers, `#7a92a5` borders).
   - Standard retro link colors (`#0000cc` blue links, `#800080` purple visited, `#cc0000` hover red).
   - Pure Web Directory metrics: Level/XP fantasy metrics removed in favor of authentic Join Date, State, and Verification status.
   - Clean retro webmaster typography and icons (zero emojis across all templates).

3. **Standalone SVG Map with Dynamic State Text Labels & Fallback**:
   - `public/graphics/states.svg` is stored separately as a standalone SVG graphic asset.
   - `addStateMapLabels()` dynamically calculates path bounding box centroids (`getBBox()`) and overlays state labels (`<text class="state-label">`) directly onto the SVG map with white stroke outlines (`paint-order: stroke fill`) and `pointer-events: none;`.

4. **Web 1.0 468x60 Pure CSS Retro Banner Network**:
   - Includes 5 classic banner ad designs: Tricolor Flash, Patriotic Marquee, Windows 95 3D Bevel Button, Simulated GIF Animation, and Tricolor Ribbon.

5. **Data Model**:
   - `users`: `id`, `secret_key_hash`, `email`, `max_sites`, `created_at`.
   - `sites`: `id`, `user_id`, `slug` (unique), `url`, `title`, `status` (`pending` | `verified` | `suspended`), `state` (`TEXT`, optional).
   - `secret_reset_tokens`: `user_id`, `token_hash`, `expires_at`, `used_at`.

---

## Critical Workflows & Operations
- **Join**: `POST /api/join` { title, url, slug, email, state } &rarr; returns `secretKey` (shown once) + widget HTML snippet.
- **Verification**: `POST /api/verify` { slug } &rarr; scrapes site homepage HTML for `api/ring` widget URL.
- **Ring Navigation**: `GET /api/ring?action=next|prev|random&slug=...` &rarr; redirects to next verified site.
- **Member Dashboard**: Login via raw secret token &rarr; `POST /api/manage` { action: 'login', secretKey }. Can add/update `state`.
- **Super Admin**: Super Admin panel allows editing `state` for any site.

---

## Environment Variables & Config
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `ADMIN_SECRET`
- `SECRET_HASH_PEPPER` (Must remain fixed; changing invalidates member logins)
- `ZAPIER_WEBHOOK_URL` (Optional)

---

## Recent Accomplishments
- **Interactive Map State Labels**: Dynamically overlays state names directly onto the SVG map shapes with white stroke outlines and click-through pointer events (`pointer-events: none;`).
- **Web 1.0 Theme Conversion**: Completely redesigned WebSutra from RPG Fantasy Video Game theme to an authentic Early 2000s Web Directory (Yahoo! / DMOZ style).
- **Standalone SVG Map Loader**: Preserved `public/graphics/states.svg` as a separate asset with dynamic `fetch()` loading and local `states.js` fallback for offline viewing.
- **Web 1.0 468x60 Retro Banner Ads**: Built 5 pure CSS animated 468x60 banner ads and integrated them onto the homepage and widget catalog.
- **Zero Emojis Policy**: Stripped out all emojis across the codebase, replacing them with clean retro webmaster typography, text/ASCII bracket indicators, and GIF icons.
- **Complete Portal Page Alignment**: Updated all static pages (`index.html`, `members.html`, `join.html`, `widgets.html`, `dashboard.html`, `admin.html`, `reset-secret.html`, `api-docs.html`, `demo.html`, and `widget.js`).
