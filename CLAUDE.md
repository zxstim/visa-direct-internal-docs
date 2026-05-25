# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Fumadocs-based internal documentation portal built with Next.js 16, React 19, and Tailwind CSS 4.

## Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run types:check  # Type checking (fumadocs-mdx + next typegen + TypeScript)
npm run lint         # ESLint validation
```

Note: Bun is available as an alternative package manager (bun.lock present).

## Architecture

### Content System
- Documentation content lives in `/content/docs/` as MDX files
- Fumadocs MDX plugin generates type-safe collections from MDX (output in `.source/`, gitignored)
- Schema validation for frontmatter defined in `source.config.ts`
- Content source loader in `lib/source.ts` provides page trees and search indexing

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
