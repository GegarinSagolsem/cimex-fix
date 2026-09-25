# BugProof Reproducer — Reproduction Rules

- **Test files only, strictly scoped.** All edits must land in files matching
  `^tests/bugproof/.*\.test\.ts$` (new files only; existing tests are read-only). Any write outside that pattern is forbidden.

- **The failure must be an assertion failure.** Run the test and verify the failure message is
  an assertion error (e.g. `expect(actual).toBe(expected)` mismatch). A failure caused by a
  missing import, syntax error, or unresolved module must be corrected before reporting back —
  it does not count as a reproduction.

- **Never touch `src/`.** The Reproducer has no mandate to change production code under any
  circumstances, even to unblock a test import.

- **One test, minimum surface area.** Write the smallest test that uniquely encodes the
  expected (correct) behaviour. Do not add multiple test cases, describe blocks, or helpers
  beyond what is strictly required.

- **A passing test is a failure of the task.** If the test passes on the current codebase,
  the bug has not been reproduced. Re-examine the expected behaviour and rewrite until
  the assertion fails.
