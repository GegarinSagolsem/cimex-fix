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
