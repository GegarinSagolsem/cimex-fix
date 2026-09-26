# Submission texts (lablab.ai) — copy from here

Numbers come from `docs/benchmark.md`; refresh them if the benchmark changes. Word limits are checked with
`node scripts/count-words.mjs` (long description and Bob usage statement ≤ 500 words each).

## Project title

Cimex Fix — No fix without proof

## Short description

IBM Bob turns a bug report into a Proof of Fix: a failing test, the culprit commit found by git bisect, a
permission-scoped fix, an adversarial review — and a live dashboard that shows every step.

## Long description — Problem & Solution

**The problem.** AI assistants can suggest a patch in seconds, but nobody proves it fixes *this* bug or breaks
nothing else. In Stack Overflow's 2025 survey, 66% of developers named "AI solutions that are almost right, but not
quite" their top frustration, and 45% said debugging AI-generated code takes longer. Reviewers get a diff, not
evidence: no test that failed before and passes after, no commit that caused the bug, no record of what was checked.
Reproducing the bug is usually the slowest step, and it is the step AI tools skip.

**Who it is for and how it works.** Developers on bug-fix or on-call duty, reviewers and tech leads, and QA engineers
who file bugs. A bug report — a customer screenshot, a QA PDF, a server log or an issue — goes into IBM Bob, and the
developer picks the Cimex Lead mode. The Lead spawns three subagents in parallel (Triage reads the report, Locator
maps the code path, Historian checks recent changes), then hands off to permission-scoped modes: the Reproducer may
only write test files and must produce a test that fails on an assertion; git bisect, run through our MCP server,
uses that test to name the exact culprit commit; the Fixer may only edit source files — tests are read-only for it,
so it cannot "fix" the bug by weakening the test; a read-only Critic reviews the fix and can send it back once.
Mission Control, a web dashboard, shows the agents working live and publishes a shareable Proof of Fix page with the
failing test, the culprit commit, the diff, the review, a plain-English summary from IBM watsonx.ai Granite, and two
commands anyone can run to verify the proof themselves.

**What is new.** Cimex Fix treats a fix as unproven until there is evidence. The pipeline's guarantees come from Bob
itself: file-level edit permissions per mode make the separation between "write the test" and "write the fix"
enforceable, not a prompt suggestion. Every claim on the Proof page is backed by recorded evidence, and failures stay
visible — when bisect could not name a culprit during a run, the case says so and a follow-up bisect is recorded as
such.

**Impact so far.** On a demo shop with 8 planted bugs, Bob proved all 8, from screenshots, a QA PDF, a
server log and issue text. All 8 culprit commits match the seeded answer key. The median time from report to a failing
test was 4m 02s; the cleanest run went from customer issue to published proof in 7m 44s with no human prompts. The
median cost was 2.93 Bobcoins per fix. Five IBM watsonx.ai models each gave one answer per bug with all the code
handed to them: 24 of 40 answers fixed the bug, and the best, gpt-oss-120b, matched Cimex Fix's 8/8. Every number is generated from raw case events in the public repo.

## IBM Bob Usage Statement

**Bob is the runtime.** Every Cimex Fix case is an IBM Bob run, driven by a Bob pack we ship in the repo
(`bob/pack/`):

- **Custom modes with file-level permissions.** Four modes — Lead, Reproducer, Fixer, Critic — each with its own
  role, instructions and edit scope: the Lead may only write `.bugproof/`, the Reproducer only
  `tests/bugproof/*.test.ts`, the Fixer only `src/**/*.ts`, and the Critic nothing. This is what makes "the fix
  cannot touch the test" enforceable.
- **Parallel subagents.** The Lead launches Triage, Locator and Historian in the same turn and synthesises their
  reports.
- **Subtasks and hand-offs.** The Lead delegates to the Reproducer, Fixer and Critic with `start_subtask`; each hands
  back with `end_subtask`, keeping every worker's context small and cheap.
- **Document understanding.** Bob reads the intake as it arrives: customer screenshots, a QA report PDF, a server
  log and issue text.
- **Skills and rules.** Three skills (repro-test, root-cause, proof-of-fix) and per-mode rules (e.g. assert only the
  reported symptom; deterministic tests for timing bugs; never guess a culprit).
- **Our MCP server.** Six tools — open_case, record, evidence, run_tests, bisect, publish_proof — connect Bob to
  Mission Control. `bisect` runs `git bisect` in a temporary worktree with a pre-flight check, a skip cap and a time
  budget, so it fails fast with a reason instead of hanging.
- **Todo lists** track each case's steps inside Bob.

**Bob during development.** Bob generated `AGENTS.md` with `/init`, built the first versions of the custom modes,
rules, skills and MCP server, and ran every benchmark case. When runs stalled, Bob's own task history showed us why
(a worker mode could not hand back; a lowercase drive letter broke bisect), and we fixed the pack and re-ran bisect
in Bob. Task-session screenshots are in `bob_sessions/`.

**Bobcoins.** 32.64 Bobcoins across every Bob task — 8 bug runs, follow-up bisects and building the pack — tracked
per task in `docs/benchmark.md`.

**IBM watsonx.ai.** Granite (`ibm/granite-4-h-small`) writes each Proof of Fix's plain-English summary for
non-technical readers, grounded in the Lead's technical summary and the full diff, and powers the live `/triage`
page that turns a messy bug report into a structured triage.

Claude Code helped build the web dashboard and the glue code.

## Tags

IBM Bob, watsonx.ai, Granite, Debugging, Developer Tools, MCP, AI Agents, Testing, Next.js, TypeScript, Vercel

## Links

- Live app: https://bugproof-web.vercel.app
- Repository: https://github.com/GegarinSagolsem/bugproof
- Demo target repository: https://github.com/GegarinSagolsem/bugproof-demo-shoplite
