# bugproof-mcp

MCP server for the BugProof Bob pack. Provides tools for opening cases, recording events, running tests, bisecting regressions, and publishing proof to BugProof Cloud.

## Setup

Set the following environment variables (or point `BUGPROOF_ENV_FILE` at a `.env` file):

| Variable | Required | Description |
|---|---|---|
| `BUGPROOF_API_URL` | ✅ | Base URL of the BugProof Cloud API |
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

Opens a new BugProof investigation case.

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

- `expect: "red"` → `ok=true` only if ≥1 assertion failure (no import/syntax errors)
- `expect: "green"` → `ok=true` only if all tests pass

---

### `bisect`

Git-bisects a regression using a test file. Creates a temporary worktree and runs `git bisect run` to locate the first bad commit.

**Inputs:** `testFile`, `good?`, `bad?` (default `HEAD`), `caseId?`, `repoPath?`

**Returns:** `{ sha, subject, author, date, diff, steps }`

---

### `publish_proof`

Publishes the final proof for a case to BugProof Cloud.

**Inputs:** `summary`, `status` (`proven|unproven`), `caseId?`, `repoPath?`

**Returns:** `{ proofUrl }`
