# AGENTS.md — Agent (coding) mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious coding rules

- **Build order matters**: `packages/shared` must be built (`npm run build --workspace=packages/shared`) before `apps/web` can resolve `@bugproof/shared`. The root `npm run build` handles this; manual workspace builds do not.
- **ESM `.js` extensions required** in `packages/shared/src/` — even when importing `.ts` files, use `.js` suffix (TypeScript resolves them correctly in ESM mode).
- **Zod dual-export pattern**: every new schema in `packages/shared/src/schemas.ts` must export both the Zod validator and the `z.infer<>` type under the same name.
- **Tailwind v4 custom tokens**: design tokens live in `apps/web/src/app/globals.css` under `:root` and `@theme inline`. Reference them as CSS vars (`bg-[var(--accent)]`), not as Tailwind utility names.
- **No path alias outside `apps/web`**: the `@/*` alias (`./src/*`) is only available in `apps/web`. `packages/shared` uses relative imports.
- **`packages/mcp` is a stub** (README + package.json only) — Bob builds it. Do not add implementation code there.
- **`bob/` directory** is for Bob-native artifacts only. Do not add web app code there.
- **mockCase fixture is the UI source of truth** until real API routes exist — import from `@bugproof/shared`, do not inline mock data in components.
- When adding API routes in `apps/web`, follow Next.js App Router conventions (`app/api/<route>/route.ts`). Redis (Upstash) is the planned backing store — see `Plan.md` and `context.md` for connection details before implementing.
- Run `npm run typecheck` and `npm run lint` (from `apps/web/`) before committing. The `reviewer` subagent (`.claude/agents/reviewer.md`) automates this check.
