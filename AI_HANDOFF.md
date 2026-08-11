# AI Handoff: WebSutra Webring

## Purpose
WebSutra is a static site + serverless API for an India-focused webring & directory celebrating handmade personal homepages, indie blogs, and webmasters. Users submit a site, receive a secret key + widget snippet, and verify placement. Member and admin dashboards exist. The DB is the single source of truth.

---

## Repository Map
- **Serverless API (DB-backed, primary)**:
  - `api/join.js` - Handles site registration (including optional state selection), password hashing, and widget snippet generation.
  - `api/verify.js` - Scrapes member site to verify WebSutra widget code placement.
  - `api/ring.js` - Handles next/prev/random redirects and JSON responses.
  - `api/members.js` - Returns verified and pending webring members with member_days and state.
  - `api/manage.js` - Member dashboard CRUD API (login, add_site, update, delete) with state field management.
  - `api/admin.js` - Super admin API (list all, reset links, user/site/state management).
  - `api/reset-secret.js` - One-time secret reset consumption.
  - `api/latest.js` - Cached API endpoint returning 10 latest verified sites.
- **Lib Helper Utilities (`lib/`)**:
  - `lib/db-init.mjs` - Exports `INDIAN_STATES` array and automatic DB schema initialization helper `ensureStateColumn(db)` to alter table schema automatically if needed.
  - `lib/secret-hash.mjs` - HMAC-SHA256 secret hashing algorithms.
  - `lib/secret-reset-tokens.mjs` - One-time secret reset token generation and consumption.
- **Static UI (`public/`)**:
  - `public/index.html` - **Primary Full-Screen Interactive World Map Viewport** (Hero Guild HUD with HP/MP bars, pan/zoom, state matching, real Level/XP calculation per state, Mana Ember particle canvas, `📜` FAB Quest Scroll, slide-out Quest Tome drawer).
  - `public/members.html` - **Gamified Guild Champions Gallery & XP Leaderboard** (Displays verified members only, state badges, level & XP based on `member_days`, live search, and sorting).
  - `public/demo.html` - **Traditional Scrolling Homepage** (About WebSutra, inline map, Member Gallery, and Members Directory table).
  - `public/join.html` - Dedicated Webring registration page ("Guild Charter Desk") with optional Indian State dropdown, secret key generator, and snippet output.
  - `public/dashboard.html` - Member login & site management dashboard ("Hero Keep") with optional State selection and real Level/XP status badges.
  - `public/admin.html` - Super admin dashboard ("High Wizard Citadel") with full State assignment capabilities for all sites.
  - `public/reset-secret.html` - One-time secret reset page ("Key Recovery Altar").
  - `public/api-docs.html` - Interactive API documentation ("Oracle API Reference").
  - `public/widget.js` - Embeddable webring widget script.
  - `public/style.css` - **Classic Fantasy RPG World Map & Questbook Design System** (Highly legible `Plus Jakarta Sans` body typography, parchment cards, embossed wood & gold 3D buttons, RPG status bars, `Press Start 2P`, `Cinzel Decorative`, `Courier Prime`).
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
   - Web UI in `public/index.html`, `public/members.html`, `public/join.html`, etc. interact with `/api/*` endpoints.
   - Automatic DB schema initialization (`ensureStateColumn` in `lib/db-init.mjs`) automatically adds `state` column to `sites` table on request.
   - Secret key hashes use HMAC-SHA256 with a pepper (`SECRET_HASH_PEPPER`).

2. **Full-Screen Interactive Map & Questbook Navigation System**:
   - `public/index.html` serves as a full-viewport (`100vw` × `100vh`) interactive realm map.
   - Features **Google Maps-Style Pan & Zoom Engine**: mouse wheel zoom, mouse drag pan, mobile touch pinch-to-zoom, touch drag pan, and runic `[ ➕ ]` / `[ ➖ ]` / `[ 🧭 ]` control stack.
   - Features **HTML5 Canvas Mana Ember Background** (`#constellations-bg`) rendering floating golden embers and cyan mana sparks.
   - Built-in **Web Audio API Chiptune SFX Engine**: zero-dependency audio synthesizer for button clinks, parchment drawer unrolls, and hover harps with `🔊 SFX ON` toggle.
   - Floating `📜` Quest Scroll FAB button opens a parchment modal drawer containing `Overview`, `Join Guild`, `Members Gallery`, `Directory`, `Oracle FAQ`, `Manifesto`, `Codex`, `Privacy`, and `Key Login`.

3. **Gamified XP Leaderboard System (`members.html` & Map Popups)**:
   - Displays verified member websites (`status === 'verified'`).
   - XP Formula: `500 Base XP + (member_days * 100 XP)`.
   - Level Formula: `Math.floor(Math.sqrt(totalXP / 20))`.
   - Dynamic Ranks: `Apprentice Webmaster`, `Realm Knight`, `Arch-Mage of HTML`, `Grand Guild Champion`, `Sovereign Master`.

4. **Data Model**:
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
- **Highly Legible Typography Upgrade**: Replaced cramped cursive fonts with Google Font `'Plus Jakarta Sans'`, providing crisp, modern, highly readable body text while preserving medieval `'Cinzel'` headings.
- **Dynamic Map & Dashboard Level/XP Calculation**: Replaced hardcoded "LEVEL 99" badges with dynamic Level and XP calculations based on `member_days` across state popups and member dashboards.
- **Optional Indian State Support & Auto DB Migration**: Added optional `state` selection dropdown across sign up (`join.html`), member dashboard (`dashboard.html`), and admin panel (`admin.html`), with automatic DB schema migration (`ensureStateColumn`) in `lib/db-init.mjs`.
- **Gamified Members Gallery (`public/members.html`)**: Created a dedicated verified members gallery with level badges, XP bars based on `member_days`, state badges, live search filtering, and leaderboard sorting.
- **Web Audio API Chiptune SFX Engine**: Synthesized retro RPG sound effects for button clicks, drawer unrolls, and hover states with audio mute toggle (`🔊 SFX ON`).
