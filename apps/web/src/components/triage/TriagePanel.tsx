"use client";

import * as React from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TriageResultCard, type TriageResponse } from "@/components/triage/TriageResultCard";
import { TriageResultSkeleton } from "@/components/triage/TriageResultSkeleton";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 6000;

export interface TriageExampleChip {
  label: string;
  text: string;
}

export function TriagePanel({ examples }: { examples: TriageExampleChip[] }) {
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<TriageResponse | null>(null);

  const remaining = MAX_LENGTH - text.length;
  const overLimit = remaining < 0;
  const canSubmit = text.trim().length > 0 && !overLimit && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `Request failed (${res.status})`;
        setError(message);
        return;
      }

      setResponse(data as TriageResponse);
    } catch {
      setError("Couldn't reach the triage service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste a bug report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Example bug reports">
            {examples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setText(example.text)}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {example.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="triage-text" className="text-sm font-medium text-[var(--text)]">
              Bug report, issue, QA note, or server log
            </label>
            <textarea
              id="triage-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              maxLength={MAX_LENGTH + 500}
              placeholder="Paste an issue, QA note, or a chunk of server log here..."
              className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-describedby="triage-char-count"
            />
            <div className="flex items-center justify-between">
              <p
                id="triage-char-count"
                className={cn("text-xs", overLimit ? "text-[var(--danger)]" : "text-[var(--muted)]")}
              >
                {text.length} / {MAX_LENGTH} characters
              </p>
              <Button type="submit" disabled={!canSubmit}>
                <Sparkles className="size-4" aria-hidden="true" />
                {loading ? "Triaging..." : "Triage with Granite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div aria-live="polite" className="flex flex-col gap-4">
        {error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        {loading ? <TriageResultSkeleton /> : null}

        {!loading && response ? <TriageResultCard response={response} /> : null}
      </div>
    </div>
  );
}
