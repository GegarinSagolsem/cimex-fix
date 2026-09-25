# BugProof — instructions for Claude Code (keep this file short)

**Read `context.md` first** — it is the current state. Read `Plan.md` one section at a time
(`grep -n "^## " Plan.md`). `model.md` = model, effort and token-budget rules.

## Rules
- Model: Sonnet + effort medium by default. Opus only via `opusplan` / plan mode for design, or after
  2 failed fix attempts. Haiku for trivial edits. Never Fable, never `/model best`.
- Don't read the whole codebase. Before exploring code, read `graphify-out/GRAPH_REPORT.md` (if it
  exists), then use `graphify query "<question>"` · `graphify explain "<symbol>"` · `graphify path "<a>" "<b>"`.
- After code changes, refresh from the repo root: `graphify . --code-only` then `graphify cluster-only .`
  (never an LLM backend).
- Stick to Plan.md. Before deviating, log the decision + reason in context.md → Decisions.
- After meaningful work, update context.md (Done / Added / Removed / Changed, next steps, Bob task log).
- Bob-native parts (modes, skills, rules, MCP server, hooks, BugProof runs) are built and run in IBM
  Bob — Claude reviews and integrates them only.
- Never commit secrets: `.env*` stays in `.gitignore` and `.bobignore`; document names in `.env.example`.
- Every number we claim must exist in `docs/benchmark.md` or have a cited source.
- Windows machine: the Bash tool is Git Bash. Repo lives at `C:\dev\bugproof` (not OneDrive).
