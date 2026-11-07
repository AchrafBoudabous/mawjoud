"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SparklineProps = {
  /** One value per period, oldest first; null = no data (drawn as a gap). */
  values: (number | null)[];
  /** Tooltip heading per period, e.g. "Sem. du 03/11". */
  labels: string[];
  /** Tooltip value text per period (precomputed: this is a client
   *  component and functions cannot cross the server boundary). */
  valueLabels: string[];
  ariaLabel: string;
  /** Fixed max for the y scale (e.g. 1 for a share); defaults to data max. */
  max?: number;
  className?: string;
};

const W = 132;
const H = 36;
const PAD = 4;

/**
 * 12-point trend line. Single series, so no legend: the column header
 * names it. De-emphasis hue for the line, accent for the current period
 * (dataviz stat-tile contract). Hover / focus a week for its value; the
 * same numbers are in the CSV table view.
 */
export function Sparkline({ values, labels, valueLabels, ariaLabel, max, className }: SparklineProps) {
  const [active, setActive] = useState<number | null>(null);
  const n = values.length;
  const numeric = values.filter((v): v is number => v !== null);
  const top = max ?? Math.max(1, ...numeric);
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, n - 1);
  const y = (v: number) => H - PAD - (v / top) * (H - 2 * PAD);

  // Split into runs of consecutive non-null points (gaps stay gaps).
  const runs: { i: number; v: number }[][] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    const last = runs.at(-1);
    if (last && last.at(-1)!.i === i - 1) last.push({ i, v });
    else runs.push([{ i, v }]);
  });

  const lastIdx = values.findLastIndex((v) => v !== null);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? -1) + 1, n - 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? n) - 1, 0));
    else return;
    e.preventDefault();
  }

  if (numeric.length === 0) return null;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((a) => a ?? lastIdx)}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      className={cn("relative inline-block rounded-control outline-offset-2", className)}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block overflow-visible">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-line" strokeWidth={1} />
        {runs.map((run, k) =>
          run.length === 1 ? (
            <circle key={k} cx={x(run[0].i)} cy={y(run[0].v)} r={2} className="fill-muted" />
          ) : (
            <polyline
              key={k}
              points={run.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
              fill="none"
              className="stroke-muted"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        )}
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD - 2} y2={H - PAD} className="stroke-line-strong" strokeWidth={1} />
        )}
        {lastIdx >= 0 && (
          <circle cx={x(lastIdx)} cy={y(values[lastIdx]!)} r={4} className="fill-brand-600 stroke-surface" strokeWidth={2} />
        )}
        {active !== null && values[active] !== null && active !== lastIdx && (
          <circle cx={x(active)} cy={y(values[active]!)} r={4} className="fill-ink stroke-surface" strokeWidth={2} />
        )}
        {/* Hit columns: the whole period's width, not the 2px line. */}
        {values.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (W - 2 * PAD) / Math.max(1, n - 1) / 2}
            y={0}
            width={(W - 2 * PAD) / Math.max(1, n - 1)}
            height={H}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
          />
        ))}
      </svg>
      {active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs shadow-float"
          style={{ left: x(active) }}
        >
          <span className="block font-bold text-ink tabular-nums">{valueLabels[active]}</span>
          <span className="block text-muted">{labels[active]}</span>
        </div>
      )}
    </div>
  );
}
