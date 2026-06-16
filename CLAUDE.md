# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A **Fumadocs** internal documentation portal (Next.js 16, React 19, Tailwind CSS 4) that hosts the
engineering specifications for the **Visa Direct tourist top-up platform** — company **"tc"**,
partner bank **PVCB (PVcomBank, Vietnam)**. The platform lets a tourist fund a local **VND** account
by pulling funds from their foreign Visa card via a Visa Direct **Account Funding Transaction (AFT)**.

The deliverable in this repo is the **documentation**, not the platform code. The specs describe
Java/Spring microservices to be built by a small team (2 backend + 2 Flutter).

## Commands

Use **`bun run`**, not npm (run `bun run types:check` after every content change to validate MDX).

```bash
bun run dev          # Start development server (port 3010)
bun run build        # Production build
bun run types:check  # Type checking (fumadocs-mdx + next typegen + TypeScript) — the validation gate
bun run lint         # ESLint validation
bun run db:generate  # Drizzle: generate SQL migration from db/schema.ts
bun run db:migrate   # Drizzle: apply migrations (Neon Postgres — site auth/access store)
bun run db:studio    # Drizzle Studio
```

## Documented system (keep specs consistent with this)

Specs live in `/content/docs/specifications/`; nav order is in each `meta.json`. Current services:

- **tc-api-gateway** — thin **Spring Cloud Gateway** (Server MVC, same JDK 25 / Spring Boot 4
  stack — **not Kong**): partner auth (mTLS + JWS verify), authorization limits, **one** public
  endpoint (the 3DS callback), admin forward-only. Routes are Java `RouterFunction`s; controls are
  custom `HandlerFilterFunction` filters (`JwsVerifyFilter`, `AuthLimitFilter`, `CallbackTokenFilter`,
  `IpAllowlistFilter`). Three surfaces — public/partner/admin — from one image via Spring profiles.
  **No outbound webhooks to PVCB.**
- **tc-cardload-service** — synchronous top-up orchestrator. Five modules — **Tokenization**
  (Cybersource Flex/TMS **+ VTS network token**), **Decision Manager**, **Payer Authentication**,
  **Visa Direct** (AFT), **Foreign Exchange** (Visa daily FX rate, cached + per-txn snapshot) —
  plus an **FTAI eligibility** gate (Visa PAAI, runs before Cybersource) and a **fee-config**
  fetch (from tc-admin-service, placeholder). PVCB request → response (+ `/top-up-status` polling).
- **tc-settlement-service** — **Visa settlement reconciler only**: ingest the settlement file →
  parse → **match each line to the authorization + prefunding legs** (on the Visa
  `transactionIdentifier`) → report breaks. **No ledger** — PVCB is the book of record; PVCB owns
  liquidity/exposure.
- **tc-admin-service** — Spring Security 7 admin backend (session, password, TOTP, passkeys, RBAC,
  tags, audit trail, limits config, dashboards).
- **tc-admin-portal** — Flutter web front-end for tc-admin-service.

Inside `specifications/` (nav order in `specifications/meta.json`): `index.mdx` (specs overview)
and `architecture.mdx` (system-wide design + combined DBML data map) come before the five service
specs. Top-level docs (`content/docs/`, nav order in `content/docs/meta.json`): `index.mdx`
(program overview), `code-style-guide.mdx` (Java conventions), `engineering-ground-rules.mdx`
(team working agreement — signed commits, PRs, CI gates, PCI hygiene), `timeline.mdx` (build plan),
`deployment.mdx` (Docker/Compose for the documented platform).

## Key design principles (these are settled — keep edits consistent)

- **Synchronous REST** (`RestClient`) — **no message broker**, no SQS/outbox.
- **No webhooks to PVCB** — every request returns a response; PVCB **polls** `/top-up-status`.
- **No general ledger in tc** — settlement only reconciles; PVCB holds the books.
- **Money-safety:** persist-first/write-ahead status, exactly-once Visa (unique STAN,
  GET-status-on-timeout, **never blind-resend**, reversal), idempotency keys, **fail-closed**,
  autonomous reaper, T+n reconciliation backstop.
- **PCI / tokenization:** PAN **never** enters `tc-*`. Cybersource TMS is the **VTS token
  requestor** (network token + AFT cryptogram); Cybersource legs use the Cybersource token, Visa
  legs use the **network token**. Never put PAN/CVV/track data in examples or logs; MLE to Visa.
- **HA:** primary + standby MySQL (semi-sync, RPO≈0); stateless services run active-active.
- **Stack:** JDK 25, Spring Boot 4.0+, Spring Security 7, MySQL 8.4 LTS, Maven, Java virtual
  threads; Flutter 3.44 / Dart 3.12 for the portal.

## Conventions when editing specs

- **Validate with `bun run types:check`** after every change.
- **Verify external API endpoints against public docs and cite them** — accuracy over memory
  (Cybersource, Visa Direct, PAAI/FTAI, Visa FX).
- **Ripple changes:** a change to one service usually needs matching edits in `architecture.mdx`
  (the system-wide DBML + flow), `index.mdx`, and `timeline.mdx`. Keep cross-references and the
  combined data map in sync.
- Each spec carries DB schema as **DDL + dbdiagram.io DBML**; keep both in step.
- Frontmatter schema (`title`, `description`, `permission: member|admin`) is in `source.config.ts`.

## Architecture (the docs site itself)

### Content System
- Documentation content lives in `/content/docs/` as MDX files.
- Fumadocs MDX plugin generates type-safe collections from MDX (output in `.source/`, gitignored).
- Schema validation for frontmatter defined in `source.config.ts`.
- Content source loader in `lib/source.ts` provides page trees and search indexing.

### Routing Structure
- `/app/(home)/` - Landing page route group
- `/app/docs/[[...slug]]/` - Dynamic catch-all routes for documentation pages
- `/app/api/search/` - Full-text search API using Orama
- `/app/llms.txt/` and `/app/llms-full.txt/` - LLM-friendly text exports of documentation

### Access control & data (the site is auth-gated)
- The whole portal sits behind auth. `proxy.ts` (matches `/docs/*`, `/llms*.txt`, sign-in/up)
  redirects unauthenticated users to `/sign-in` and unverified users to `/not-verified`.
- Auth is **better-auth** (email/password **+ passkey**) on **Drizzle ORM + Neon Postgres**:
  config in `lib/auth.ts` / `lib/auth-client.ts`, schema in `db/schema.ts`, migrations in
  `db/migrations/`, `drizzle.config.ts` (needs `DATABASE_URL`). This is separate from the
  documented Visa platform's own MySQL.
- Page-level gating: `permission` frontmatter (`member|admin`, single value or array, defaults
  to `member`) is validated in `source.config.ts`.

### Scripts & data hygiene
- `scripts/parse-ep705.ts` parses Visa **EP705** settlement files into JSON (used while writing
  the settlement spec). Run with `bun run scripts/parse-ep705.ts`.
- **`/data` is git-ignored** (so are `*.pem` and `.env*`) — raw EP705 files contain **clear
  PANs**. Never commit `data/`, and never paste PAN/CVV/track data into chat, logs, or examples.

### Key Files
- `lib/source.ts` - Core content loading logic and Fumadocs source configuration
- `lib/layout.shared.tsx` - Shared navigation configuration via `baseOptions()`
- `source.config.ts` - MDX content schema definitions (Zod validation, incl. `permission`)
- `mdx-components.tsx` - Custom MDX component overrides
- `proxy.ts` - Auth middleware (session check, sign-in / email-verification redirects)
- `lib/auth.ts` / `lib/db.ts` - better-auth server config and Drizzle/Neon client
- `db/schema.ts` + `db/migrations/` - Auth/access database schema and migrations

### Path Aliases
- `@/*` - Points to project root
- `fumadocs-mdx:collections/*` - Generated content collections
