import type { Event } from "@bugproof/shared";

export function toOffsetSec(ts: string, startedAt: string): number {
  return (new Date(ts).getTime() - new Date(startedAt).getTime()) / 1000;
}

export function timelineDurationSec(events: Event[], startedAt: string, endedAt?: string): number {
  if (endedAt) return toOffsetSec(endedAt, startedAt);
  const lastTs = events.reduce((max, e) => Math.max(max, toOffsetSec(e.ts, startedAt)), 0);
  return Math.max(lastTs, 1);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
