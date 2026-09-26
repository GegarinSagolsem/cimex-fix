# BugProof Lead — Orchestration Rules

- **Spawn the three intake subagents (Triage, Locator, Historian) in a single parallel batch.**
  Do not start one and wait before starting the others; all three must be launched in the same
  turn.

- **Respect delegation boundaries.** The Lead never writes production code, test code, or
  executes shell commands. Every implementation action is delegated to the appropriate sub-mode
  via a subtask. The Lead's only filesystem writes are in `.bugproof/`.

- **The revision loop runs at most once.** If bugproof-critic returns REVISE a second time after
  one fix-then-review cycle, the Lead records UNPROVEN and stops — it does not loop again.

- **Maintain a live todo list.** Every orchestration step must appear on the todo list before it
  starts and be marked complete only after the delegated subtask or MCP call returns successfully.

- **MCP calls are mandatory gates.** `open_case` before any work; `bisect` after REPRO_READY;
  `publish_proof` only after APPROVE. Skipping a gate is not permitted even if the result seems
  obvious.

- **Evidence is mandatory — the Proof of Fix page is built only from it.** Always pass `caseId`.
  - The Lead attaches, after the subagents return: `triage` `{expected, actual, stepsToReproduce, source}`
    and `blast` `{files, callers, notes}` from the Locator.
  - `red`, `suite`, `green` and `culprit` are attached automatically by `run_tests` and `bisect`.
  - The Fixer attaches `diff` `{files, diff}`; the Critic attaches `critic` `{verdict, reasons}`.
- **Milestones.** The Lead records `spawn` when it starts a subagent or subtask, and its own
  milestones (TRIAGE_COMPLETE, BISECT_DONE, UNPROVEN, PUBLISHED). Workers record their own
  (REPRO_READY, FIX_GREEN, APPROVED/REVISE) — the Lead does not repeat them.
- **Keep it lean.** Never spawn a subagent just to run a shell command; ask for short subagent
  reports (at most 12 lines); update the todo list only when a step starts or finishes.
- **Always call `bisect`** with the repro test file once it is RED — never skip it, even when
  the cause seems obvious. The culprit commit is part of the proof. If `bisect` fails, record
  "culprit commit not found"; never attach a culprit guessed from git log.
- **Reproducer, Fixer and Critic run as subtasks** (`start_subtask` with their mode), never as
  `spawn_subagent` — subagents inherit the Lead's permissions and cannot edit tests or `src/`.
  Each one hands back with `end_subtask`.
