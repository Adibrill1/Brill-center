# Brill Center

מערכת לניהול מרחבים קהילתיים חכמים ואנלוגיים · Smart & analog community space management.

Monorepo layout: the **backend API** lives at the repository root; the **web app** (Next.js) lives in [`web/`](web/).

## Stack

- **Backend**: Node.js 20+ / TypeScript (strict, ESM), Express + Zod, PostgreSQL + Prisma (JSONB for dynamic attributes), JWT auth with roles (`ADMIN` / `OPERATOR` / `CLIENT`), Vitest
- **Web**: Next.js 15 (App Router) + React 19, full he/en i18n with RTL, custom design system
- **AI**: Anthropic SDK (`claude-opus-4-8`) for marketing content generation, with a bilingual template fallback when no API key is configured

## Quick start

```bash
# Backend
npm install
cp .env.example .env          # fill in real secrets
docker compose up -d          # local PostgreSQL 16
npm run db:migrate            # apply migrations
npm run db:seed               # demo operator/client/space/schedule
npm run dev                   # http://localhost:3001

# Web app (second terminal)
cd web
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

Seeded logins: `operator@brill.center` / `operator123!` · `client@brill.center` / `client123!`

## Web app

- **Home** — public bilingual schedule feed (upcoming activities + approved community ideas)
- **Smart booking** — pick a space/date/duration; free slots are ranked by historical demand (quietest first). Low-demand slots in auto-confirm spaces are approved instantly and issue the temporary access code on the spot
- **Idea gallery** — propose, vote (one vote per user), see statuses
- **Brill Studio** (operators) — bookings approval, inventory with low-stock alerts, treasury with audit log, idea approval, and the **AI Content Studio** (WhatsApp messages / printable flyers / social posts generated from the real schedule)
- **Sign in** — email/password or Google (when `GOOGLE_CLIENT_ID` is configured)

## Smart scheduling

`GET /api/schedule/feed` powers the public schedule. `GET /api/schedule/:spaceId/suggestions?date=&durationMinutes=` returns free slots ranked by a demand matrix aggregated from booking history per (weekday, hour). Spaces with `config.autoConfirm: true` skip manual approval for low-demand slots — `POST /api/bookings` then returns the access code immediately.

## AI content generation

`POST /api/content/generate` (operator-only) builds WhatsApp messages, printable A4 flyers (self-contained HTML) or social posts from the real upcoming schedule, in Hebrew or English. With `ANTHROPIC_API_KEY` set, copy is written by Claude (`claude-opus-4-8`); without it, a deterministic bilingual template engine takes over. Everything is stored in `generated_content` for reuse.

## Bilingual by design (i18n)

No user-facing string is hardcoded. Every API response message is resolved through `src/i18n/messages.ts` (Hebrew + English for every key). Language resolution order:

1. `?lang=he|en` query parameter
2. `Accept-Language` header (`he`, `iw`, `en` variants)
3. Authenticated user's `languagePref`
4. Default: **Hebrew**

Entity content is stored in explicit bilingual columns (`name_he`/`name_en`, `item_name_he`/`item_name_en`, `content_he`/`content_en`), and UI strings for the web/mobile clients are served from the `translations` table (`GET /api/translations?lang=en`).

## Security model

- **Auth**: JWT bearer tokens; public registration only creates `CLIENT` accounts. `requireRole` middleware guards operator routes (ADMIN inherits OPERATOR).
- **Access codes are dynamic, temporary and encrypted**:
  - Generated per confirmed booking (crypto-random 6 digits), never persisted in plaintext.
  - Stored as keyed **HMAC-SHA256** hash for verification + **AES-256-GCM** ciphertext for delivery to trusted hardware only.
  - Valid strictly inside the booking window ± `ACCESS_CODE_GRACE_MINUTES`; revoked automatically on cancellation.
- **Hardware webhooks** (Home Assistant bridge) authenticate with an **HMAC-SHA256 signature** over the raw body (`x-brill-signature`) — devices are not users. Every event is audited in `webhook_events`.

## API overview

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google` |
| Schedule | `GET /api/schedule/feed`, `GET /api/schedule/:spaceId/suggestions` |
| Content | `POST /api/content/generate`*, `GET /api/content`* |
| Spaces | `GET /api/spaces`, `GET /api/spaces/:id`, `POST /api/spaces`*, `PATCH /api/spaces/:id`* |
| Bookings | `GET/POST /api/bookings`, `POST /api/bookings/:id/confirm`* (issues access code), `POST /api/bookings/:id/cancel` (revokes code) |
| Inventory | `GET/POST /api/inventory`, `PATCH /api/inventory/:id`*, `POST /api/inventory/:id/usage` — every usage report checks `threshold` and dispatches a low-stock alert |
| Ideas | `GET/POST /api/ideas`, `POST /api/ideas/orchestrator` (ingests the Idea Orchestrator's `<proposal_data>` XML → structured JSONB), `POST /api/ideas/:id/vote` (one vote per user), `POST /api/ideas/:id/status`* (approval workflow) |
| Treasury | `GET /api/treasury/:spaceId`*, `POST /api/treasury/:spaceId/transactions`* — balance changes append to a JSONB audit log |
| Translations | `GET /api/translations`, `PUT /api/translations`* |
| Hardware | `POST /api/webhooks/home-assistant` (signed ingest), `POST /api/webhooks/verify-code` (keypad validation; first valid entry activates the booking) |

`*` = operator/admin only.

## Database schema

See [`prisma/schema.prisma`](prisma/schema.prisma) — users, spaces (digital/analog/hybrid with JSONB `config` for analog kits & Home Assistant entities), bookings, access codes, inventory items with thresholds, ideas + votes, per-space treasuries with JSONB transaction audit logs, translations, and a webhook event audit trail.

## Project docs

Specifications live in [`docs/`](docs/): system architecture, roadmap, database schema, idea orchestrator agent spec, and handoff instructions.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with reload |
| `npm run build` / `npm start` | Production build & run |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Unit tests (access-code crypto, orchestrator XML parsing, i18n coverage) |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations & seed |
