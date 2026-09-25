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

- **Evidence is mandatory — the Proof of Fix page is built only from it.** After each step, attach
  evidence with the MCP `evidence` tool (always pass `caseId`):
  - after the subagents return: `triage` `{expected, actual, stepsToReproduce, source}` and
    `blast` `{files, callers, notes}` from the Locator;
  - `red` and `culprit` are attached automatically by `run_tests` (expect "red") and `bisect`;
  - after the fix: `diff` `{files, diff}` (output of `git diff -- src`), then make sure the
    Fixer ran `run_tests` on the repro file with expect "green" and the full suite (`suite`);
  - after review: `critic` `{verdict, reasons}`.
- **Record a milestone for every agent.** Use `record` with the agent's own name: kind `spawn`
  when a subagent/subtask starts and kind `milestone` when it finishes, with a one-line result.
- **Always call `bisect`** with the repro test file once it is RED — never skip it, even when
  the cause seems obvious. The culprit commit is part of the proof.
