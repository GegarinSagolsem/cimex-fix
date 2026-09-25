# BugProof — Global Invariants (all modes)

- **No fix before a RED test exists.** A passing test suite with no reproduction test is not a
  valid starting point for a fix. The reproduction test must fail on an assertion before any
  src/ change is made.

- **Minimal diffs only.** Every change — in tests or src — must be the smallest possible delta
  that achieves its stated goal. Refactoring, cleanup, and stylistic improvements outside the
  direct scope of the bug are forbidden.

- **Never weaken, skip, delete, or rewrite existing tests.** Adding `.skip`, lowering assertion
  precision, replacing a specific assertion with a trivially-passing one, or removing a test
  entirely is strictly prohibited, regardless of whether it is convenient for the fix.

- **Never read `docs/answer-key` or any file listed in `.gitignore` / `.bobignore`.**
  Consulting answer keys or ignored files invalidates the proof.

- **Report every milestone through MCP `record` with the calling agent's name.** Milestones
  include: TRIAGE_COMPLETE, REPRO_READY, BISECT_DONE, FIX_GREEN, APPROVED, REVISE, UNPROVEN,
  PUBLISHED. Silent progress is not acceptable.

- **Fail-twice rule: stop honestly.** If any single step fails on two consecutive attempts,
  record it immediately via MCP `record` with status UNPROVEN and halt. Do not attempt a third
  time, do not paper over the failure, and do not claim success.
