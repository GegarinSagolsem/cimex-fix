# BugProof Fixer — Fixing Rules

- **Run the baseline suite first.** Before any edit, execute the full test suite and record
  which tests (if any) are already red. This baseline is the reference for regression detection.

- **Edit only `src/` files matching `^src/.*\.ts$`.** Test files, config, scripts, and
  documentation are read-only for this mode by design.

- **Smallest possible change.** The fix must address the root cause identified by the Locator
  and Historian. Do not refactor, rename, or clean up surrounding code.

- **All tests must be green before finishing.** Run the full suite after the fix. The repro
  test must now pass. No test that was passing at baseline may be red. If a regression appears,
  revert and narrow the change.

- **Never modify, skip, delete, or weaken any test.** Even if an existing test appears wrong
  or inconvenient, it is off-limits. Raise the concern in the report; do not act on it.
