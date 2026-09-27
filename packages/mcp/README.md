# bugproof-mcp

MCP server for the Cimex Fix Bob pack. Provides tools for opening cases, recording events, running tests, bisecting
regressions, and publishing a Proof of Fix to Mission Control (the Cimex Fix web app).

## Setup

Set the following environment variables (or point `BUGPROOF_ENV_FILE` at a `.env` file):

| Variable | Required | Description |
|---|---|---|
| `BUGPROOF_API_URL` | ✅ | Base URL of Mission Control (e.g. `https://cimex-fix.vercel.app`) |
| `BUGPROOF_INGEST_TOKEN` | ✅ | Bearer token for the `/api/ingest` endpoint |
| `BUGPROOF_ENV_FILE` | optional | Path to a dotenv file to load on startup |

## Build & run

```bash
# from repo root
npm install
npm run build -w bugproof-mcp

# start
node packages/mcp/dist/index.js
```

## Tools

### `open_case`

Opens a new Cimex Fix investigation case.

**Inputs:** `title`, `source` (`screenshot|issue|pdf|log`), `severity?`, `repo?`, `repoPath?`

**Returns:** `{ caseId, url }`

---

### `record`

Records an event on the active or specified case.

**Inputs:** `agent` (one of `lead|triage|locator|historian|reproducer|fixer|critic`), `kind` (`spawn|tool|milestone|evidence|status`), `title`, `data?`, `caseId?`, `repoPath?`

**Returns:** `{ ok, caseId }`

---

### `run_tests`

Runs vitest in `repoPath` and returns pass/fail counts plus up to 5 failure details.

**Inputs:** `file?`, `expect?` (`red|green|any`), `caseId?`, `repoPath?`

**Returns:** `{ ok, passed, failed, total, durationMs, failures }`

- `expect: "red"` → `ok=true` only if ≥1 assertion failure (no import/syntax errors). A confirmed RED run also
  writes the case's **test lock** (see below).
- `expect: "green"` → `ok=true` only if all tests pass

---

### `bisect`

Git-bisects a regression using a test file. Creates a temporary worktree and runs `git bisect run` to locate the first bad commit.

**Inputs:** `testFile`, `good?`, `bad?` (default `HEAD`), `caseId?`, `repoPath?`

**Returns:** `{ sha, subject, author, date, diff, steps }`

---

### `publish_proof`

Publishes the final proof for a case to Mission Control.

**Inputs:** `summary`, `status` (`proven|unproven`), `caseId?`, `repoPath?`

**Returns:** `{ proofUrl }`

## Test lock

Bob's edit tool keeps each mode inside its own files, but modes can also run shell commands. So when `run_tests`
confirms RED, the server hashes every file under `tests/` plus the Vitest config into a lock file in the OS temp
folder (outside the repo and every mode's edit scope), keyed by repo and case. `publish_proof` with `status: "proven"`
re-hashes them and records a milestone on the case:

- `TESTS_UNCHANGED` — every locked file matches the RED run and no test that existed in the commit the case started
  on was modified or deleted; the proof is published.
- `TESTS_CHANGED` — a test (or the config) changed or disappeared; the proof is refused.
- `TESTS_UNCHECKED` — no RED run was recorded for this case; the proof is refused.

A later RED run re-takes the lock (the Reproducer may refine its new test), so the lock also keeps the commit from the
first RED run: an existing test that differs from that commit blocks the proof even after a re-lock, committed or not.
Every re-lock and the files that changed between locks are reported in the milestone, so they show on the Proof page.

`status: "unproven"` is always accepted.
