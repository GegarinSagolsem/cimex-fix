import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import { openCase, openCaseInput } from "./tools/open_case.js";
import { record, recordInput } from "./tools/record.js";
import { runTests, runTestsInput } from "./tools/run_tests.js";
import { bisect, bisectInput } from "./tools/bisect.js";
import { publishProof, publishProofInput } from "./tools/publish_proof.js";

const cfg = loadConfig();

const server = new McpServer({
  name: "bugproof",
  version: "0.1.0",
});

// ── open_case ────────────────────────────────────────────────────────────────
server.registerTool(
  "open_case",
  {
    description:
      "Open a new BugProof case. Creates a unique case ID, sends it to the cloud, " +
      "and writes the ID to <repoPath>/.bugproof/active-case.",
    inputSchema: {
      title: z.string().min(1).describe("Short title for the case"),
      source: z.enum(["screenshot", "issue", "pdf", "log"]).describe("Origin of the bug report"),
      severity: z.enum(["low", "medium", "high", "critical"]).optional().describe("Severity level"),
      repo: z.string().optional().describe("Repository name (defaults to dirname of repoPath)"),
      repoPath: z.string().optional().describe("Working directory (defaults to process.cwd())"),
    },
  },
  async (input) => {
    const result = await openCase(cfg, input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── record ───────────────────────────────────────────────────────────────────
server.registerTool(
  "record",
  {
    description:
      "Record an event on the active (or specified) case. " +
      "agent must be one of: lead, triage, locator, historian, reproducer, fixer, critic.",
    inputSchema: {
      agent: z.enum(["lead", "triage", "locator", "historian", "reproducer", "fixer", "critic"])
        .describe("Agent name"),
      kind: z.enum(["spawn", "tool", "milestone", "evidence", "status"])
        .describe("Event kind"),
      title: z.string().min(1).describe("Event title"),
      data: z.record(z.string(), z.unknown()).optional().describe("Optional structured payload"),
      caseId: z.string().optional().describe("Case ID (defaults to active-case file)"),
      repoPath: z.string().optional().describe("Working directory (defaults to process.cwd())"),
    },
  },
  async (input) => {
    const result = await record(cfg, input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── run_tests ─────────────────────────────────────────────────────────────────
server.registerTool(
  "run_tests",
  {
    description:
      "Run vitest in repoPath and return pass/fail counts plus up to 5 failure details. " +
      "When expect='red' verifies at least one assertion failure. " +
      "When expect='green' verifies all tests pass. Records evidence when a caseId is known.",
    inputSchema: {
      file: z.string().optional().describe("Optional test file or glob"),
      expect: z.enum(["red", "green", "any"]).optional().describe("Expected outcome"),
      caseId: z.string().optional().describe("Case ID (defaults to active-case file)"),
      repoPath: z.string().optional().describe("Working directory (defaults to process.cwd())"),
    },
  },
  async (input) => {
    const result = await runTests(cfg, input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── bisect ───────────────────────────────────────────────────────────────────
server.registerTool(
  "bisect",
  {
    description:
      "Git-bisect a regression using a test file. Creates a temporary git worktree at the " +
      "'bad' commit, then runs git bisect to locate the first bad commit. Returns sha, " +
      "subject, author, date, diff (trimmed to 6000 chars), and step count.",
    inputSchema: {
      testFile: z.string().describe("Relative path to the test file inside repoPath"),
      good: z.string().optional().describe("Known good commit (defaults to root commit)"),
      bad: z.string().optional().default("HEAD").describe("Known bad commit (defaults to HEAD)"),
      caseId: z.string().optional().describe("Case ID (defaults to active-case file)"),
      repoPath: z.string().optional().describe("Working directory (defaults to process.cwd())"),
    },
  },
  async (input) => {
    const result = await bisect(cfg, input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── publish_proof ─────────────────────────────────────────────────────────────
server.registerTool(
  "publish_proof",
  {
    description:
      "Publish the proof for a case. Calls POST /api/cases/<id>/publish and returns a proofUrl.",
    inputSchema: {
      summary: z.string().min(1).describe("Plain-English summary of the proof"),
      status: z.enum(["proven", "unproven"]).describe("Final case status"),
      caseId: z.string().optional().describe("Case ID (defaults to active-case file)"),
      repoPath: z.string().optional().describe("Working directory (defaults to process.cwd())"),
    },
  },
  async (input) => {
    const result = await publishProof(cfg, input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── start ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
