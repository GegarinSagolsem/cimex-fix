# AGENTS.md — Ask mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious documentation context

- `context.md` is the authoritative living state document — more current than README or Plan.md.
- `Plan.md` is the master plan; read it one section at a time (`grep -n "^## " Plan.md`).
- `model.md` contains model selection, effort levels, cost budgets, and prompt templates — not just model names.
- `packages/shared/src/mockCase.ts` is the canonical example of the full BugProof data model (Case, Event, Evidence with all enum values populated).
- `docs/specs/` holds cloud session specs (`demo-app.md`, `ui-shell.md`) — the ground truth for what the web UI and demo app should look like.
- `bob/` directory is intentionally near-empty — Bob-native artifacts are built via IBM Bob tasks, not stored in the repo (except for outputs).
- `.claude/agents/scout.md` and `.claude/agents/reviewer.md` define Claude Code subagents for cheap lookup and pre-commit review respectively.
- `CLAUDE.md` is intentionally very short — it is loaded every session so verbosity is costly.
- The "Fixer" agent in the BugProof workflow has a hard constraint: it cannot touch test files (only the Reproducer writes tests).
- `graphify` is a CLI tool used for codebase navigation — check for `graphify-out/GRAPH_REPORT.md` before reading source files.
