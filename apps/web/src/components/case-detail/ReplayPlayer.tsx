"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import type { Event } from "@bugproof/shared";
import { toOffsetSec, timelineDurationSec } from "@/lib/timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 4, 16] as const;

export function ReplayPlayer({
  events,
  startedAt,
  endedAt,
}: {
  events: Event[];
  startedAt: string;
  endedAt?: string;
}) {
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => toOffsetSec(a.ts, startedAt) - toOffsetSec(b.ts, startedAt)),
    [events, startedAt],
  );
  const totalDuration = timelineDurationSec(events, startedAt, endedAt);

  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const [position, setPosition] = React.useState(0);

  React.useEffect(() => {
    if (!playing) return;
    const tickMs = 200;
    const id = setInterval(() => {
      setPosition((p) => {
        const next = p + (tickMs / 1000) * speed;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [playing, speed, totalDuration]);

  const currentEvent = [...sorted]
    .reverse()
    .find((e) => toOffsetSec(e.ts, startedAt) <= position);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="outline"
          aria-label={playing ? "Pause replay" : "Play replay"}
          onClick={() => {
            if (!playing && position >= totalDuration) setPosition(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.1}
          value={position}
          onChange={(e) => {
            setPlaying(false);
            setPosition(Number(e.target.value));
          }}
          aria-label="Replay scrub position"
          className="h-1.5 flex-1 accent-[var(--accent)]"
        />

        <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? "default" : "outline"}
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className={cn("px-2 font-mono")}
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>

      <p className="min-h-5 truncate font-mono text-xs text-[var(--muted)]" aria-live="polite">
        {currentEvent ? currentEvent.title : "Ready to replay"}
      </p>
    </div>
  );
}
