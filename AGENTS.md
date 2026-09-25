# AGENTS.md

Read context.md first — it is the live project state.

This file provides guidance to agents when working with code in this repository.

**Read `context.md` first** — it is the living project state. Read `Plan.md` one section at a time (`grep -n "^## " Plan.md`). `model.md` = model, effort and token-budget rules.

## Key rules (from CLAUDE.md)
- Before exploring code, check `graphify-out/GRAPH_REPORT.md` (if it exists), then use `graphify query "<question>"` / `graphify explain "<symbol>"` / `graphify path "<a>" "<b>"`. Never read the whole codebase.
- After code changes, refresh: `graphify . --code-only` then `graphify cluster-only .` (never an LLM backend).
- Stick to `Plan.md`. Log any deviation + reason in `context.md → Decisions`.
- After meaningful work, update `context.md` (Done / Added / Removed / Changed, next steps, Bob task log).
- Bob-native parts (modes, skills, rules, MCP server, hooks, BugProof runs) are built in IBM Bob — Claude reviews and integrates only.
- Never commit secrets: `.env*` stays in `.gitignore` and `.bobignore`; document names in `.env.example`.
- Every number claimed must exist in `docs/benchmark.md` or have a cited source.
- Windows machine: shell is Git Bash. Repo lives at `C:\dev\bugproof` (not OneDrive).

## Monorepo structure
```
apps/web          → Next.js 16 (App Router, TS, Tailwind v4, src dir)
packages/shared   → @bugproof/shared — Zod schemas + mockCase fixture (ESM, builds to dist/)
packages/mcp      → stub only; Bob builds this
bob/              → Bob-native artifacts (gitkeep only for now)
docs/specs/       → Cloud session specs (demo-app.md, ui-shell.md)
```

## Commands
```bash
# From repo root:
npm run build        # builds packages/shared then apps/web
npm run typecheck    # runs tsc --noEmit in all workspaces
npm run test         # runs tests in all workspaces (none yet)

# From apps/web/:
npm run dev          # Next.js dev server
npm run lint         # ESLint (eslint-config-next/core-web-vitals + typescript)

# From packages/shared/:
npm run build        # tsc emit to dist/ (required before apps/web can import it)
```

## Critical non-obvious patterns

- **`@bugproof/shared` must be built before `apps/web`** — it resolves to `dist/index.js`. Root `npm run build` handles order; workspace `dev` does not rebuild it automatically.
- **Zod types are dual-declared**: every schema is both a `z.infer<>` type and a Zod validator with the same name (e.g. `export const Case = z.object(...)` + `export type Case = z.infer<typeof Case>`). Follow this pattern everywhere in `packages/shared/`.
- **`mockCase` / `mockEvents` / `mockEvidence`** in `packages/shared/src/mockCase.ts` are the UI development fixtures until the real API is live. Import from `@bugproof/shared`.
- **Tailwind v4** is used — tokens are defined as CSS custom properties in `globals.css` and exposed via `@theme inline`. Use `bg-[var(--bg)]`, `text-[var(--accent)]`, etc. — not arbitrary Tailwind color names.
- **Design system**: dark-first, IBM Plex Sans + IBM Plex Mono, Mission Control palette (`--bg #0b0d12`, `--surface #12151c`, `--border #232836`, `--text #e8eaf0`, `--muted #8b93a5`, `--accent #4589ff`).
- **`LayoutProps<"/">`** is used in `layout.tsx` — it's a Next.js-provided generic; don't import it explicitly.
- **`packages/shared` is ESM** (`"type": "module"`). Import paths inside it must use `.js` extension (e.g. `import type { Case } from "./schemas.js"`).
- **No test framework installed yet** — `packages/mcp` mock data uses vitest command strings as reference only. When adding tests to the demo app, use vitest (`vitest run <file>` for a single test).
- **Cloud sessions clone from GitHub**, not local disk — always commit + push before launching a cloud session.
