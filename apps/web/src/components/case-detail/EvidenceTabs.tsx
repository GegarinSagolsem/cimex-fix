"use client";

import type { Evidence, EvidenceKind } from "@bugproof/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/case-detail/DiffViewer";
import { isApproved, verdictLabel } from "@/lib/display";

const TAB_ORDER: EvidenceKind[] = ["triage", "red", "culprit", "diff", "green", "critic"];
const TAB_LABEL: Record<EvidenceKind, string> = {
  triage: "Triage",
  red: "RED",
  culprit: "Culprit",
  diff: "Fix diff",
  green: "GREEN",
  suite: "Suite",
  blast: "Blast radius",
  critic: "Critic",
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function text(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

// Mock data uses the first field name in each `??` chain; the MCP tools and Bob send the later ones.
function EvidenceBody({ evidence }: { evidence: Evidence }) {
  const d = evidence.data;

  switch (evidence.kind) {
    case "triage": {
      const steps = isStringArray(d.steps) ? d.steps : isStringArray(d.stepsToReproduce) ? d.stepsToReproduce : [];
      return (
        <dl className="grid gap-3 text-sm">
          {(text(d.severity) || text(d.component)) && (
            <div>
              <dt className="text-xs text-[var(--muted)]">Severity / component</dt>
              <dd className="mt-0.5">
                {String(d.severity ?? "—")} · {String(d.component ?? "—")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-[var(--muted)]">Expected</dt>
            <dd className="mt-0.5">{String(d.expected ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Actual</dt>
            <dd className="mt-0.5">{String(d.actual ?? "—")}</dd>
          </div>
          {steps.length > 0 && (
            <div>
              <dt className="text-xs text-[var(--muted)]">Steps</dt>
              <dd className="mt-0.5">
                <ol className="list-decimal space-y-0.5 pl-5">
                  {steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </dd>
            </div>
          )}
          {text(d.source) && <p className="font-mono text-xs text-[var(--muted)]">{String(d.source)}</p>}
        </dl>
      );
    }

    case "red":
    case "green": {
      const first = Array.isArray(d.failures) ? (d.failures[0] as { name?: unknown; message?: unknown } | undefined) : undefined;
      const summary =
        text(d.summary) ??
        (typeof d.total === "number" ? `${d.passed ?? 0} passed · ${d.failed ?? 0} failed · ${d.total} total` : "");
      const failure = text(d.failure) ?? text(first?.message)?.split("\n")[0];
      return (
        <div className="flex flex-col gap-3 text-sm">
          {text(d.command) && <p className="font-mono text-xs text-[var(--muted)]">{String(d.command)}</p>}
          <p>
            <Badge variant={evidence.kind === "red" ? "danger" : "success"}>{summary}</Badge>
          </p>
          {text(first?.name) && <p className="text-xs text-[var(--muted)]">{String(first?.name)}</p>}
          {failure && (
            <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--danger)]">
              {failure}
            </pre>
          )}
          {typeof d.file === "string" && (
            <p className="font-mono text-xs text-[var(--muted)]">{d.file}</p>
          )}
        </div>
      );
    }

    case "culprit": {
      const sha = text(d.shortSha) ?? (text(d.sha) ?? text(d.commit) ?? "").slice(0, 7);
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-mono text-xs text-[var(--accent)]">{sha}</p>
          <p className="font-medium">{text(d.message) ?? text(d.subject) ?? ""}</p>
          <p className="text-xs text-[var(--muted)]">
            {[text(d.author), text(d.date), text(d.file)].filter(Boolean).join(" · ")}
          </p>
          {text(d.note) && <p className="text-xs text-[var(--muted)]">{String(d.note)}</p>}
        </div>
      );
    }

    case "diff":
      return <DiffViewer patch={text(d.patch) ?? text(d.diff) ?? ""} />;

    case "critic": {
      const verdict = String(d.verdict ?? "");
      const notes = isStringArray(d.notes) ? d.notes : isStringArray(d.reasons) ? d.reasons : [];
      return (
        <div className="flex flex-col gap-3 text-sm">
          <Badge variant={isApproved(verdict) ? "success" : "danger"}>{verdictLabel(verdict)}</Badge>
          {notes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    default:
      return (
        <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs">
          {JSON.stringify(d, null, 2)}
        </pre>
      );
  }
}

export function EvidenceTabs({ evidence }: { evidence: Evidence[] }) {
  const present = TAB_ORDER.filter((kind) => evidence.some((e) => e.kind === kind));

  if (present.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No evidence published yet.</p>;
  }

  return (
    <Tabs defaultValue={present[0]}>
      <TabsList>
        {present.map((kind) => (
          <TabsTrigger key={kind} value={kind}>
            {TAB_LABEL[kind]}
          </TabsTrigger>
        ))}
      </TabsList>
      {present.map((kind) => {
        const item = evidence.findLast((e) => e.kind === kind);
        if (!item) return null;
        return (
          <TabsContent key={kind} value={kind}>
            <EvidenceBody evidence={item} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
