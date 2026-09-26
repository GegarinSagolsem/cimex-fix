"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mmss } from "@/components/impact/format";

export interface TimeRow {
  bug: number;
  title: string;
  minutesToRed: number | null;
  minutesToProof: number | null;
  humanInterventions: number;
  coins: number;
}

const TICK_MINUTES = 10;

// The plot area stops 4rem short of the track so the value label at the longest bar's tip never clips.
const PLOT = "relative mr-16 h-full";
const COLUMNS = "grid grid-cols-[minmax(0,6.5rem)_1fr] gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]";

export function TimeToProofChart({ rows }: { rows: TimeRow[] }) {
  const longest = Math.max(...rows.map((r) => r.minutesToProof ?? 0));
  const domain = Math.max(TICK_MINUTES, Math.ceil(longest / TICK_MINUTES) * TICK_MINUTES);
  const ticks = Array.from({ length: domain / TICK_MINUTES + 1 }, (_, i) => i * TICK_MINUTES);
  const pct = (m: number) => `${(m / domain) * 100}%`;

  return (
    <TooltipProvider delayDuration={0}>
      <figure className="flex flex-col gap-3">
        <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-r-[4px] bg-[var(--accent)]" aria-hidden="true" />
            Time to proof
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" aria-hidden="true" />
            Failing (RED) test written
          </span>
        </figcaption>

        <ul className="flex flex-col">
          {rows.map((r) => {
            const summary = `Bug #${r.bug} ${r.title}: RED test at ${mmss(r.minutesToRed)}, proven at ${mmss(r.minutesToProof)}, ${r.humanInterventions} human prompts, ${r.coins.toFixed(2)} Bobcoins`;
            return (
              <Tooltip key={r.bug}>
                <TooltipTrigger asChild>
                  <li
                    tabIndex={0}
                    aria-label={summary}
                    className={`${COLUMNS} items-center rounded-md px-1 py-1 outline-none hover:bg-[var(--border)]/40 focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
                  >
                    <span className="truncate text-xs text-[var(--muted)]">
                      #{r.bug} {r.title}
                    </span>
                    <div className="h-6">
                      <div className={PLOT}>
                        {ticks.map((t) => (
                          <span key={t} className="absolute inset-y-0 w-px bg-[var(--border)]" style={{ left: pct(t) }} aria-hidden="true" />
                        ))}
                        {r.minutesToProof != null && (
                          <>
                            <span
                              className="absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-r-[4px] bg-[var(--accent)]"
                              style={{ width: pct(r.minutesToProof) }}
                              aria-hidden="true"
                            />
                            <span
                              className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-2 font-mono text-xs tabular-nums text-[var(--text)]"
                              style={{ left: pct(r.minutesToProof) }}
                              aria-hidden="true"
                            >
                              {mmss(r.minutesToProof)}
                            </span>
                          </>
                        )}
                        {r.minutesToRed != null && (
                          <span
                            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]"
                            style={{ left: pct(r.minutesToRed) }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  </li>
                </TooltipTrigger>
                <TooltipContent side="top" align="end">
                  <p className="font-medium">
                    #{r.bug} {r.title}
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[var(--muted)]">
                    <dt>RED test</dt>
                    <dd className="font-mono tabular-nums text-[var(--text)]">{mmss(r.minutesToRed)}</dd>
                    <dt>Proven</dt>
                    <dd className="font-mono tabular-nums text-[var(--text)]">{mmss(r.minutesToProof)}</dd>
                    <dt>Human prompts</dt>
                    <dd className="font-mono tabular-nums text-[var(--text)]">{r.humanInterventions}</dd>
                    <dt>Bobcoins</dt>
                    <dd className="font-mono tabular-nums text-[var(--text)]">{r.coins.toFixed(2)}</dd>
                  </dl>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ul>

        <div className={`${COLUMNS} px-1`} aria-hidden="true">
          <span />
          <div className="h-4">
            <div className={PLOT}>
              {ticks.map((t, i) => (
                <span
                  key={t}
                  className={`absolute -translate-x-1/2 font-mono text-[10px] tabular-nums text-[var(--muted)] ${i % 2 ? "hidden sm:inline" : ""}`}
                  style={{ left: pct(t) }}
                >
                  {t}m
                </span>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </TooltipProvider>
  );
}
