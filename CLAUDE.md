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
bun run dev          # Start development server (port 3000)
bun run build        # Production build
bun run types:check  # Type checking (fumadocs-mdx + next typegen + TypeScript) — the validation gate
bun run lint         # ESLint validation
```

## Documented system (keep specs consistent with this)

Specs live in `/content/docs/specifications/`; nav order is in each `meta.json`. Current services:

- **tc-api-gateway** — Kong edge: partner auth (mTLS + JWS), authorization limits, **one** public
  endpoint (the 3DS callback), admin forward-only. **No outbound webhooks to PVCB.**
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

Supporting docs: `architecture.mdx` (system-wide design + combined DBML data map), `index.mdx`
(overview), `code-style-guide.mdx` (Java conventions), `timeline.mdx` (build plan).

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

### Key Files
- `lib/source.ts` - Core content loading logic and Fumadocs source configuration
- `lib/layout.shared.tsx` - Shared navigation configuration via `baseOptions()`
- `source.config.ts` - MDX content schema definitions (Zod validation)
- `mdx-components.tsx` - Custom MDX component overrides

### Path Aliases
- `@/*` - Points to project root
- `fumadocs-mdx:collections/*` - Generated content collections
