# AGENTS.md — Plan mode

This file provides guidance to agents when working with code in this repository.

## Non-obvious architectural constraints

- **Bob builds Bob-native parts; Claude integrates**: modes, skills, rules, MCP server, hooks, and every BugProof run are authored in IBM Bob. Claude (and this repo's CI) only review and integrate the outputs.
- **Fixer cannot touch tests** — this is a hard architectural constraint in the BugProof agent workflow, not a convention. The Reproducer writes the failing test; the Fixer may only edit source code.
- **Watsonx/Granite outputs must be cached at generation time** — IBM Cloud account closes Sep 27 10 AM ET, so live Granite will be unavailable during judging. Every watsonx call must persist its result; `/triage` falls back to recorded output.
- **Demo app is a separate repo** (`bugproof-demo-shoplite`) with a real, unmodified commit history — `git bisect` requires clean history; backdating is prohibited by hackathon rules.
- **`packages/shared` is the contract layer** between the Bob MCP pack and the web app. Schema changes there must be coordinated — the MCP server (Bob-built) and the API routes (web-built) both consume it.
- **Redis (Upstash) is the only planned persistence layer** for the web app. There is no SQL database. Events and evidence are stored as JSON blobs keyed by `caseId`.
- **`packages/mcp` stub is intentional** — implementing it in Claude would duplicate Bob's work. Architecture treats it as an external dependency.
- **Two separate i18n / font systems don't exist** — fonts (IBM Plex) are loaded once in `apps/web/src/app/layout.tsx` and exposed as CSS variables. There is no separate i18n system at this stage.
- **Vercel deployment root is `apps/web`** — the monorepo root is not the deploy target. Cloud sessions must stay inside `apps/web` for web changes.
- **Every benchmark number must have a source in `docs/benchmark.md`** — do not invent latency/cost figures in plans or specs.
