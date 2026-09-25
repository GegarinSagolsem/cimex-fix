---
name: repro-test
description: Use when writing a failing test that reproduces a reported bug. Guides creation of a focused Vitest repro in tests/bugproof/ for TypeScript projects.
---

# Repro-Test

Create ONE new file: `tests/bugproof/case-<caseId>.test.ts`

## Rules

- Import the **real** module under test with a relative path from `tests/bugproof/`
  (e.g. `../../src/pricing`). No path aliases.
- One `describe` named after the bug title; 1–3 focused `it()` cases.
- No mocks unless time/randomness: use `vi.useFakeTimers()` / `vi.setSystemTime()`.
  Timezone-sensitive code: `process.env.TZ = 'Asia/Kolkata'` before the suite.
- First line: `// BugProof case: <caseId> — <short title>`
- Test **must FAIL on an assertion** (not import/type/syntax).
  Verify with MCP `run_tests`; confirm "red" before saving.

## Steps

1. Identify `caseId` and module under test from the bug report.
2. Read the relevant source file(s) — do not guess signatures.
3. Write the test file using the template below.
4. Run `run_tests` on the new file; confirm at least one `it()` fails.
5. If it passes (false green), tighten the assertion or check the export.

## Template

```ts
// BugProof case: <caseId> — <short title>
import { describe, it, expect, vi } from 'vitest'
import { <export> } from '../../src/<module>'

describe('<bug title>', () => {
  it('<expected behaviour>', () => {
    expect(<export>(<inputs>)).toBe(<expected>) // actual: <wrong value>
  })
})
```

## Example — pricing bug (BP-42)

```ts
// BugProof case: BP-42 — applyDiscount rounds down instead of up
import { describe, it, expect } from 'vitest'
import { applyDiscount } from '../../src/pricing'

describe('applyDiscount rounds to nearest cent', () => {
  it('rounds 0.5 cents up', () => {
    expect(applyDiscount(100, 10.5)).toBe(89.50) // actual: 89.49
  })
})
```
