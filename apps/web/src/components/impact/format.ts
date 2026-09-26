/** 7.74 → "7m 44s". Same rounding as scripts/build-benchmark.mjs, so page and docs agree. */
export function mmss(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const sec = Math.round(minutes * 60);
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}
