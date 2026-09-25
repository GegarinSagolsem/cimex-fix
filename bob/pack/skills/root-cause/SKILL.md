---
name: root-cause
description: Use after a culprit commit is known (from MCP bisect) or when explaining why a bug happens. Produces a structured Root cause / Why / Blast radius / Fix constraints report.
---

# Root-Cause

## Steps

1. **Read the culprit diff** — use `get_commit` or `read_file` on the changed source.
2. **State the root cause in one sentence** — what line/logic introduced the bug.
3. **Run 5 whys** — each answer must be a single short sentence.
4. **Assess blast radius** — work through every item in the checklist below.
5. **List fix constraints** — what the fix must NOT break.
6. Output the result as the markdown block defined in *Output format*.

## Blast-radius checklist

- [ ] Other callers of the changed function (search for its name across `src/`)
- [ ] Shared helpers invoked by the changed function
- [ ] API routes / controllers that reach this code
- [ ] UI paths that display the affected data
- [ ] Data already persisted that may be in the wrong state
- [ ] Tests that currently pass and implicitly rely on the wrong behaviour

## Output format

```markdown
## Root cause
<one sentence>

## Why
1. <why 1>
2. <why 2>
3. <why 3>
4. <why 4>
5. <why 5>

## Blast radius
- **Callers:** <list or "none found">
- **Shared helpers:** <list or "none">
- **API / routes:** <list or "none">
- **UI paths:** <list or "none">
- **Persisted data:** <describe risk or "none">
- **Implicitly passing tests:** <list or "none">

## Fix constraints
- Must not change <X>
- Must preserve <Y>
```
