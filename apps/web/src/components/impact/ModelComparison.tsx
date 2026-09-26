import { CheckCircle2, XCircle } from "lucide-react";

interface Checks {
  fixed: boolean;
  suiteGreen: boolean;
  proofTest: boolean;
  fixWithProof: boolean;
  culpritCorrect: boolean;
  answered?: boolean;
}

interface Contender {
  id: string;
  name: string;
  kind: string;
  fixed: number;
  suiteGreen: number;
  proofTest: number;
  fixWithProof: number;
  culpritCorrect: number;
  culpritDuringRun?: number;
  cost?: string;
  time?: string;
  medianSeconds?: number;
  medianTokens?: number;
}

export interface Comparison {
  oneShotTotals: { answers: number; complete: number; fixed: number; fixWithProof: number; culpritCorrect: number; brokeTests: number };
  bugs: number[];
  temperature: number;
  askedOn: string | null;
  region: string;
  controlsOk: boolean;
  contenders: Contender[];
  perBug: { bug: number; title: string; cimex: Checks; models: Record<string, Checks> }[];
}

function Count({ value, max, strong }: { value: number; max: number; strong?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`font-mono tabular-nums ${strong ? "font-semibold" : ""}`}>
        {value}/{max}
      </span>
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--border)]">
        <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(value / max) * 100}%` }} />
      </span>
    </span>
  );
}

function Mark({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {ok ? (
        <CheckCircle2 className="size-3.5 text-[var(--success)]" aria-hidden="true" />
      ) : (
        <XCircle className="size-3.5 text-[var(--danger)]" aria-hidden="true" />
      )}
      <span className={ok ? "" : "text-[var(--muted)]"}>{label}</span>
      <span className="sr-only">{ok ? "yes" : "no"}</span>
    </span>
  );
}

const yesNo = (ok: boolean) => (ok ? "yes" : "no");
const detail = (x: Checks) =>
  x.answered === false
    ? "No answer"
    : `Fixed (probe): ${yesNo(x.fixed)} · Nothing broken: ${yesNo(x.suiteGreen)} · Own test RED→GREEN: ${yesNo(x.proofTest)} · Culprit: ${yesNo(x.culpritCorrect)}`;

function BugCell({ x }: { x: Checks }) {
  if (x.answered === false) return <span className="text-[var(--muted)]">no answer</span>;
  return (
    <span className="flex flex-col gap-0.5 text-xs" title={detail(x)}>
      <Mark ok={x.fixWithProof} label="fix with proof" />
      <Mark ok={x.culpritCorrect} label="culprit" />
    </span>
  );
}

export function ModelComparison({ data }: { data: Comparison }) {
  const n = data.bugs.length;
  const models = data.contenders.filter((c) => c.kind === "one-shot");
  const t = data.oneShotTotals;
  const totals = [
    { value: t.complete, label: "named a culprit and returned a fix and a test" },
    { value: t.fixed, label: "fixed the bug (independent probe)" },
    { value: t.fixWithProof, label: "came with a test that proves the fix" },
    { value: t.brokeTests, label: "broke existing tests" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={`All ${t.answers} one-shot answers`}>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          All {t.answers} one-shot answers
        </p>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {totals.map((x) => (
            <div key={x.label} className="flex flex-col gap-1 rounded-xl border border-[var(--border)] p-4">
              <dt className="order-2 text-xs text-[var(--muted)]">{x.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight tabular-nums">
                {x.value}
                <span className="text-base font-normal text-[var(--muted)]">/{t.answers}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-4 font-medium">Contender</th>
              <th className="py-2 pr-4 font-medium">Fixed (independent probe)</th>
              <th className="py-2 pr-4 font-medium">Nothing broken</th>
              <th className="py-2 pr-4 font-medium">Own test RED→GREEN</th>
              <th className="py-2 pr-4 font-medium text-[var(--text)]">Fix with proof</th>
              <th className="py-2 pr-4 font-medium">Culprit commit</th>
              <th className="py-2 font-medium">Cost and time per bug</th>
            </tr>
          </thead>
          <tbody>
            {data.contenders.map((c) => {
              const pipeline = c.kind === "pipeline";
              return (
                <tr
                  key={c.id}
                  className={`border-b border-[var(--border)] align-top last:border-0 ${pipeline ? "bg-[var(--highlight)]/25" : ""}`}
                >
                  <td className="py-2.5 pl-2 pr-4">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-xs text-[var(--muted)]">
                      {pipeline ? "Bob pipeline: runs tests and git bisect" : "one answer, cannot run code"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Count value={c.fixed} max={n} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <Count value={c.suiteGreen} max={n} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <Count value={c.proofTest} max={n} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <Count value={c.fixWithProof} max={n} strong />
                  </td>
                  <td className="py-2.5 pr-4">
                    <Count value={c.culpritCorrect} max={n} />
                    {pipeline && c.culpritDuringRun !== undefined && (
                      <span className="block text-xs text-[var(--muted)]">
                        {c.culpritDuringRun}/{n} during the run
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-[var(--muted)]">
                    {pipeline ? (
                      <>
                        {c.cost}
                        <br />
                        {c.time}
                      </>
                    ) : (
                      <>
                        {c.medianTokens?.toLocaleString("en-US")} tokens
                        <br />
                        {c.medianSeconds} s per answer (median)
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="pb-2 text-left text-xs text-[var(--muted)]">
            Per bug. Hover a cell for the four checks behind it.
          </caption>
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-4 font-medium">Bug</th>
              <th className="py-2 pr-4 font-medium">Cimex Fix</th>
              {models.map((m) => (
                <th key={m.id} className="py-2 pr-4 font-medium">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.perBug.map((p) => (
              <tr key={p.bug} className="border-b border-[var(--border)] align-top last:border-0">
                <td className="py-2.5 pr-4">
                  #{p.bug} {p.title}
                </td>
                <td className="py-2.5 pr-4">
                  <BugCell x={p.cimex} />
                </td>
                {models.map((m) => (
                  <td key={m.id} className="py-2.5 pr-4">
                    <BugCell x={p.models[m.id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
