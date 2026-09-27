export type PageSlot = number | "gap";

/**
 * Page numbers to show, always the first, the last and the neighbours of the
 * current page, gaps in between (1 … 4 5 6 … 12). At most 7 slots, so the row
 * fits a small phone without scrolling.
 */
export function pageSlots(current: number, count: number): PageSlot[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
  // Near an end, show five numbers on that side so the row keeps its width.
  const start = current <= 4 ? 2 : current >= count - 3 ? count - 4 : current - 1;
  const end = current <= 4 ? 5 : current >= count - 3 ? count - 1 : current + 1;
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [
    1,
    ...(start > 2 ? ["gap" as const] : []),
    ...middle,
    ...(end < count - 1 ? ["gap" as const] : []),
    count,
  ];
}

/** Number of pages for a total; at least 1, so an empty section still has a page. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
