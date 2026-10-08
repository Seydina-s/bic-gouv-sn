/**
 * A figure under its label, with a line of detail if any. Without a figure, the
 * sentence saying why stays in body size.
 */
export function FigureTile({
  label,
  value,
  empty,
  detail,
}: {
  label: string;
  value: string | null;
  /** Said instead of the figure when there is none. */
  empty?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-line p-5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      {value === null ? (
        <dd className="mt-2 text-ink-soft">{empty}</dd>
      ) : (
        <dd className="mt-1">
          <span className="block font-display text-3xl font-extrabold tabular-nums">{value}</span>
          {detail !== undefined && <span className="text-sm text-ink-soft">{detail}</span>}
        </dd>
      )}
    </div>
  );
}
