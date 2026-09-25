import { Sparkles, History, ArrowRight } from "lucide-react";
import type { TriageResult } from "@bugproof/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/triage/SeverityBadge";

export interface TriageResponse {
  source: "granite-live" | "recorded";
  model: string | null;
  result: TriageResult;
  note?: string;
}

export function TriageResultCard({ response }: { response: TriageResponse }) {
  const { source, model, result, note } = response;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Triage result</CardTitle>
          <SeverityBadge severity={result.severity} />
          <Badge variant="default">{result.component}</Badge>
        </div>
        {source === "granite-live" ? (
          <Badge variant="agent">
            <Sparkles className="size-3.5" aria-hidden="true" />
            IBM Granite 4 · live
          </Badge>
        ) : (
          <Badge variant="warning">
            <History className="size-3.5" aria-hidden="true" />
            Recorded result
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {note ? (
          <p role="status" className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)]">
            {note}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Expected
            </h4>
            <p className="text-sm text-[var(--text)]">{result.expected}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Actual
            </h4>
            <p className="text-sm text-[var(--text)]">{result.actual}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Steps to reproduce
          </h4>
          {result.stepsToReproduce.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">None given.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {result.stepsToReproduce.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text)]">
                  <span className="font-mono text-xs text-[var(--muted)]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Missing info
          </h4>
          {result.missingInfo.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Report looks complete.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {result.missingInfo.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text)]">
                  <span className="text-[var(--warning)]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
          <span>Suggested intake:</span>
          <span className="inline-flex items-center gap-1 font-medium text-[var(--text)]">
            <ArrowRight className="size-3" aria-hidden="true" />
            {result.suggestedIntake}
          </span>
          {model ? <span className="ml-auto font-mono">{model}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
