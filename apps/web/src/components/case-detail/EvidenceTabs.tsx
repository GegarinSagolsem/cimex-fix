"use client";

import type { Evidence, EvidenceKind } from "@bugproof/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/case-detail/DiffViewer";

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

function EvidenceBody({ evidence }: { evidence: Evidence }) {
  const d = evidence.data;

  switch (evidence.kind) {
    case "triage":
      return (
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Severity / component</dt>
            <dd className="mt-0.5">
              {String(d.severity ?? "—")} · {String(d.component ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Expected</dt>
            <dd className="mt-0.5">{String(d.expected ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Actual</dt>
            <dd className="mt-0.5">{String(d.actual ?? "—")}</dd>
          </div>
          {isStringArray(d.steps) && d.steps.length > 0 && (
            <div>
              <dt className="text-xs text-[var(--muted)]">Steps</dt>
              <dd className="mt-0.5">
                <ol className="list-decimal space-y-0.5 pl-5">
                  {d.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </dd>
            </div>
          )}
        </dl>
      );

    case "red":
    case "green":
      return (
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-mono text-xs text-[var(--muted)]">{String(d.command ?? "")}</p>
          <p>
            <Badge variant={evidence.kind === "red" ? "danger" : "success"}>
              {String(d.summary ?? "")}
            </Badge>
          </p>
          {typeof d.failure === "string" && (
            <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--danger)]">
              {d.failure}
            </pre>
          )}
          {typeof d.file === "string" && (
            <p className="font-mono text-xs text-[var(--muted)]">{d.file}</p>
          )}
        </div>
      );

    case "culprit":
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-mono text-xs text-[var(--accent)]">{String(d.shortSha ?? "")}</p>
          <p className="font-medium">{String(d.message ?? "")}</p>
          <p className="text-xs text-[var(--muted)]">
            {String(d.author ?? "")} · {String(d.file ?? "")}
          </p>
        </div>
      );

    case "diff":
      return <DiffViewer patch={typeof d.patch === "string" ? d.patch : ""} />;

    case "critic":
      return (
        <div className="flex flex-col gap-3 text-sm">
          <Badge variant={d.verdict === "approved" ? "success" : "danger"}>
            {String(d.verdict ?? "")}
          </Badge>
          {isStringArray(d.notes) && (
            <ul className="list-disc space-y-1 pl-5">
              {d.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      );

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
        const item = evidence.find((e) => e.kind === kind);
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
