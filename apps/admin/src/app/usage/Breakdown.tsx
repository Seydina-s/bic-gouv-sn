"use client";

import { useState } from "react";
import { t } from "../../lib/i18n";

export interface Share {
  name: string;
  count: number;
}

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** Shades of the flag colours, strongest first; the rest is grouped under "Autres". */
const SHADES = [
  "var(--color-primary)",
  "var(--color-flag-yellow)",
  "var(--color-flag-red)",
  "var(--color-primary-pressed)",
  "var(--color-ink-faint)",
] as const;

/** The largest shares, then one "Autres" slice so the ring stays readable. */
export function groupShares(rows: readonly Share[], keep: number): Share[] {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  if (sorted.length <= keep) {
    return sorted;
  }
  const others = sorted.slice(keep - 1).reduce((total, row) => total + row.count, 0);
  return [...sorted.slice(0, keep - 1), { name: t("usage.others"), count: others }];
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A share of phones as a ring with its legend: pointing at a slice or its name
 * shows its part in the middle; the legend carries every figure as text.
 */
export function Breakdown({ title, rows }: { title: string; rows: readonly Share[] }) {
  const [focused, setFocused] = useState<number | null>(null);
  const slices = groupShares(rows, SHADES.length);
  const total = slices.reduce((sum, row) => sum + row.count, 0);
  const offsets = slices.reduce<number[]>(
    (starts, row, index) => [...starts, (starts[index] ?? 0) + row.count / total],
    [0],
  );
  const current = focused === null ? undefined : slices[focused];

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface-raised p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-ink-soft">{t("usage.noContent")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke="var(--color-surface)"
                strokeWidth="12"
              />
              {slices.map((row, index) => (
                <circle
                  key={row.name}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={SHADES[index]}
                  strokeWidth={focused === index ? 15 : 12}
                  strokeDasharray={`${String((row.count / total) * CIRCUMFERENCE)} ${String(CIRCUMFERENCE)}`}
                  strokeDashoffset={-(offsets[index] ?? 0) * CIRCUMFERENCE}
                  opacity={focused === null || focused === index ? 1 : 0.35}
                  className="transition-all duration-200"
                  onPointerEnter={() => {
                    setFocused(index);
                  }}
                  onPointerLeave={() => {
                    setFocused(null);
                  }}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="font-display text-2xl font-extrabold tabular-nums">
                {current === undefined
                  ? number.format(total)
                  : percent.format(current.count / total)}
              </span>
              <span className="max-w-24 truncate text-xs text-ink-soft">
                {current === undefined ? t("usage.total") : current.name}
              </span>
            </div>
          </div>
          <ul className="min-w-40 flex-1 space-y-1 text-sm">
            {slices.map((row, index) => (
              <li key={row.name}>
                <button
                  type="button"
                  onPointerEnter={() => {
                    setFocused(index);
                  }}
                  onPointerLeave={() => {
                    setFocused(null);
                  }}
                  onFocus={() => {
                    setFocused(index);
                  }}
                  onBlur={() => {
                    setFocused(null);
                  }}
                  className="flex min-h-9 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: SHADES[index] }}
                  />
                  <span className="flex-1 truncate">{row.name}</span>
                  <span className="tabular-nums text-ink-soft">
                    {percent.format(row.count / total)}
                  </span>
                  <span className="w-12 text-right tabular-nums">{number.format(row.count)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
