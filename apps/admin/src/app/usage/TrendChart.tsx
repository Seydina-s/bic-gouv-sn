"use client";

import type { UsageReport } from "@bgs/shared-types";
import { useId, useState, type KeyboardEvent } from "react";
import { formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";

type Day = UsageReport["days"][number];
type Metric = "active" | "firstEver";

const number = new Intl.NumberFormat("fr-FR");
const signedPercent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

/** Drawing size in SVG units: the chart scales to its box, these only set proportions. */
const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const GRID_LINES = 4;

/** A round ceiling for the axis: 1, 2, 2.5 or 5 times a power of ten. */
export function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value) ?? 10;
  return step * power;
}

/** Last 7 days against the 7 before: null without a week to compare with. */
export function weekChange(days: readonly Day[], metric: Metric): number | null {
  const sum = (slice: readonly Day[]) => slice.reduce((total, day) => total + day[metric], 0);
  const last = sum(days.slice(-7));
  const before = sum(days.slice(-14, -7));
  return days.length < 14 || before === 0 ? null : (last - before) / before;
}

/** "12/10" under the axis. */
function shortDay(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/**
 * The last 30 days as a curve (owner's request, 14/10/2026, "like Meta Ads, but
 * nicer"): people active or new each day, a week compared with the one before, and
 * every day readable by pointing at it or with the arrow keys.
 */
export function TrendChart({ days }: { days: readonly Day[] }) {
  const [metric, setMetric] = useState<Metric>("active");
  const [selected, setSelected] = useState<number | null>(null);
  const gradient = useId();
  const top = niceCeiling(Math.max(1, ...days.map((day) => day[metric])));
  const x = (index: number) =>
    PAD.left + (days.length <= 1 ? PLOT_W / 2 : (index / (days.length - 1)) * PLOT_W);
  const y = (value: number) => PAD.top + PLOT_H - (value / top) * PLOT_H;
  const line = days
    .map((day, index) => `${index === 0 ? "M" : "L"}${String(x(index))},${String(y(day[metric]))}`)
    .join(" ");
  const area =
    days.length === 0
      ? ""
      : `${line} L${String(x(days.length - 1))},${String(y(0))} L${String(x(0))},${String(y(0))} Z`;
  const change = weekChange(days, metric);
  const shown = selected === null ? null : days[selected];

  const pick = (clientX: number, box: DOMRect) => {
    const ratio = (clientX - box.left) / box.width;
    const plotted = (ratio * WIDTH - PAD.left) / PLOT_W;
    const index = Math.round(plotted * (days.length - 1));
    setSelected(Math.min(days.length - 1, Math.max(0, index)));
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, (selected ?? last + 1) - 1),
      ArrowRight: Math.min(last, (selected ?? -1) + 1),
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined && last >= 0) {
      event.preventDefault();
      setSelected(next);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-surface-raised p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div
          role="radiogroup"
          aria-label={t("usage.metric")}
          className="inline-flex gap-1 rounded-full bg-surface p-1"
        >
          {(["active", "firstEver"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={metric === choice}
              onClick={() => {
                setMetric(choice);
              }}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                metric === choice
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {t(choice === "active" ? "usage.metricActive" : "usage.metricNew")}
            </button>
          ))}
        </div>
        {change !== null && (
          <p className="text-sm text-ink-soft">
            <span
              className={`mr-2 inline-flex rounded-full px-2.5 py-0.5 font-semibold tabular-nums ${
                change >= 0
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-danger-surface text-on-danger-surface"
              }`}
            >
              {signedPercent.format(change)}
            </span>
            {t("usage.weekChange")}
          </p>
        )}
      </div>

      <div
        role="group"
        tabIndex={0}
        aria-label={t("usage.chartLabel")}
        aria-describedby={`${gradient}-help`}
        onKeyDown={keys}
        onPointerMove={(event) => {
          pick(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onPointerLeave={() => {
          setSelected(null);
        }}
        onBlur={() => {
          setSelected(null);
        }}
        className="relative touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        <svg
          viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
          className="block h-auto w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: GRID_LINES + 1 }, (_, step) => {
            const value = (top / GRID_LINES) * step;
            return (
              <g key={step}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--color-line)"
                  strokeDasharray={step === 0 ? undefined : "3 5"}
                />
                <text
                  x={PAD.left - 8}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="fill-ink-faint text-[11px] tabular-nums"
                >
                  {number.format(value)}
                </text>
              </g>
            );
          })}
          {days.map((day, index) =>
            index % 5 === days.length % 5 || index === days.length - 1 ? (
              <text
                key={day.day}
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-ink-faint text-[11px] tabular-nums"
              >
                {shortDay(day.day)}
              </text>
            ) : null,
          )}
          <path d={area} fill={`url(#${gradient})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {shown !== undefined && shown !== null && selected !== null && (
            <g>
              <line
                x1={x(selected)}
                x2={x(selected)}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                stroke="var(--color-ink-faint)"
                strokeDasharray="2 4"
              />
              <circle
                cx={x(selected)}
                cy={y(shown[metric])}
                r="6"
                fill="var(--color-surface-raised)"
                stroke="var(--color-primary)"
                strokeWidth="3"
              />
            </g>
          )}
        </svg>
        {shown !== undefined && shown !== null && selected !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm shadow-md"
            style={{
              left: `${String((x(selected) / WIDTH) * 100)}%`,
              transform: `translateX(${selected > days.length / 2 ? "-105%" : "5%"})`,
            }}
          >
            <p className="font-semibold">{formatDay(new Date(shown.day))}</p>
            <p className="tabular-nums">{t("usage.tooltipActive", { count: shown.active })}</p>
            <p className="tabular-nums text-ink-soft">
              {t("usage.tooltipNew", { count: shown.firstEver })}
            </p>
          </div>
        )}
      </div>
      <p id={`${gradient}-help`} className="text-xs text-ink-faint">
        {t("usage.chartHelp")}
      </p>
      {/* The day chosen, read out; and every day as text for screen readers. */}
      <p aria-live="polite" className="sr-only">
        {shown === undefined || shown === null
          ? ""
          : t("usage.dayLine", {
              count: shown.active,
              firstEver: shown.firstEver,
              day: formatDay(new Date(shown.day)),
            })}
      </p>
      <ol className="sr-only">
        {days.map((day) => (
          <li key={day.day}>
            {t("usage.dayLine", {
              count: day.active,
              firstEver: day.firstEver,
              day: formatDay(new Date(day.day)),
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
