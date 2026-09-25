# Spec: Mission Control UI shell (`apps/web`)

**For:** a Claude cloud session, executed autonomously, working inside this repo (`bugproof`),
**only inside `apps/web`** (plus reading, never editing, `packages/shared`). Don't ask questions —
make reasonable choices and list every assumption in the PR description.

## Goal

Build the "Mission Control" design system and app shell described in Plan.md §6, and two real
pages (`/cases` board, `/cases/[id]` live case view) driven entirely by the `mockCase` fixture from
`@bugproof/shared` (already implemented — see `packages/shared/src/mockCase.ts` and
`schemas.ts`), through a small data-access layer that can later be swapped for real API calls
without touching components.

This is UI-only. There is no backend yet — everything reads from the mock fixture.

## Tech (add as dependencies inside `apps/web`)

- Tailwind v4 (already set up) — extend tokens, don't replace them.
- shadcn/ui (Radix primitives) — run its init against this Next.js app; keep generated components
  under `src/components/ui/`.
- `motion` (Framer Motion successor) for animation.
- `lucide-react` for icons.
- `shiki` for the fix-diff code viewer.
- `next-themes` (or an equivalent minimal approach) for the dark/light toggle.

## Design tokens (Plan.md §6) — CSS variables, dark default + light toggle

Extend `src/app/globals.css` (already has partial dark tokens from Phase 0 — reconcile, don't
duplicate) with the full token set, both themes:

| Token | Dark (default) | Light |
|---|---|---|
| bg | `#0B0D12` | `#FFFFFF` |
| surface | `#12151C` | `#F4F4F4` |
| border | `#232836` | `#E0E0E0` |
| text | `#E8EAF0` | `#161616` |
| muted | `#8B93A5` | `#525252` |
| accent (IBM Blue) | `#4589FF` | `#0F62FE` |
| success / GREEN | `#42BE65` | `#198038` |
| danger / RED | `#FA4D56` | `#DA1E28` |
| warning | `#F1C21B` | `#B28600` |
| agent / AI | `#A56EFF` | `#8A3FFC` |

Fonts: IBM Plex Sans (UI) + IBM Plex Mono (code/IDs/timers) via `next/font/google` — already wired
in `src/app/layout.tsx` from Phase 0; reuse those font variables, don't re-import.

Provide a theme toggle (dark default, persisted to `localStorage`) in the top bar.

## Data-access layer

Create `src/lib/data/` with an interface-driven layer, e.g.:

```ts
// src/lib/data/types.ts
export interface CaseDataSource {
  listCases(): Promise<Case[]>;
  getCase(id: string): Promise<{ case: Case; events: Event[]; evidence: Evidence[] } | null>;
}
```

Implement `src/lib/data/mockDataSource.ts` using `mockCase`, `mockEvents`, `mockEvidence` from
`@bugproof/shared` (wrap in `Promise.resolve` to simulate async; add a couple of small artificial
variants of the case — e.g. clone `mockCase` with different ids/statuses/severities — so `/cases`
has more than one row to render). Export the active data source from `src/lib/data/index.ts` (today
= mock; swapping to a real `fetch`-based implementation later should require touching only that one
file).

## App shell

- Top bar: product name/logo mark "BugProof", theme toggle, a ⌘K command palette trigger (`cmdk` —
  can be a minimal implementation: fuzzy-jump between cases).
- Left rail: case list (id, title, status chip, source icon) — reusable between the shell and the
  `/cases` board.
- Main area: routed page content.
- Right rail (only on `/cases/[id]`): live activity feed (scrolling list of `Event`s, newest first
  or chronological — your call, note it), auto-scrolling, respecting `prefers-reduced-motion`.

## Pages

### `/cases` — case board

Grid/list of case cards: status chip (icon + label, never color-only), time-to-proof, source icon
(screenshot / issue / pdf / log \u2192 map from `CaseSource`). Skeleton loading state, empty state if
no cases. Clicking a card goes to `/cases/[id]`.

### `/cases/[id]` — live case view

- **Agent swimlanes**: one lane per `AgentName` (`lead, triage, locator, historian, reproducer,
  fixer, critic`) rendered like a trace waterfall (bars positioned/sized by event timestamps
  relative to `case.startedAt`) — bars animate in with `motion`, the "active" agent (most recent
  event) glows subtly. Must degrade gracefully (no animation, just appear) under
  `prefers-reduced-motion: reduce`.
- **Evidence tabs**: Triage, RED, Culprit, Fix diff (rendered with Shiki, syntax-highlighted
  patch/diff), GREEN, Critic — one tab per relevant `EvidenceKind` present in `mockEvidence` for
  that case. Tabs are keyboard-navigable (arrow keys + Enter/Space), visible focus rings.
- **Replay player**: play/pause, speed control 1x/4x/16x, a scrub position, and simple "captions" —
  a line of text under the player showing the current event's `title` as playback advances through
  the event timeline. Purely client-driven from `mockEvents` (no real video/audio).

## Quality bar (Plan.md §6, and acceptance below)

- Skeleton loaders + helpful empty states.
- ⌘K command palette, full keyboard navigation, visible focus rings, WCAG AA contrast in both
  themes.
- `prefers-reduced-motion` respected everywhere `motion` is used.
- Never color-only status — every status chip has an icon + text label.
- Responsive down to mobile width for `/cases` and `/cases/[id]`.

## Acceptance checks

1. `npm run build` and `npm run typecheck` pass at the repo root (`npm run build`, `npm run
   typecheck` from `C:\dev\bugproof`).
2. `npm run dev` in `apps/web`, manually open `/cases` and `/cases/[id]` (use the mock case's real
   id) in a browser — zero console errors or warnings.
3. Toggling `prefers-reduced-motion` (browser/OS setting or dev tools emulation) removes/short-
   circuits animations without breaking layout.
4. Full keyboard navigation reaches: theme toggle, command palette, case cards, evidence tabs,
   replay controls — tab order is logical, focus is always visible.
5. Light and dark theme variants both render with correct token colors (spot-check a few
   elements against the token table).
6. No `any` types introduced without justification; `@bugproof/shared` types are used for all
   case/event/evidence data — no ad hoc duplicate interfaces.

## Don't touch / out of scope

- Do not edit anything under `packages/shared` — treat its exports as a fixed contract; if a type
  is missing, add a small local adapter type in `apps/web`, don't modify the shared package.
- Do not implement `/`, `/cases/[id]/proof`, `/impact`, `/triage`, or `/how-it-works` — those are
  separate specs (Plan.md §7, session C). You may leave the existing `/` hello page untouched.
- Do not add a real backend, API routes, or Redis — mock data only.
- Do not edit `Plan.md`, `context.md`, or `model.md`.

## When finished

Run `npm run build` and `npm run typecheck` from the repo root, fix until both pass, then open a PR
titled "Mission Control UI shell: cases board + live case view" summarizing what was built, any
assumptions, and screenshots/description of both pages in both themes.
