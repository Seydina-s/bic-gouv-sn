import { IDEMPOTENCY_FIELD } from "../lib/form";

/**
 * The key a creating form sends with its write (CLAUDE.md §4.5): drawn by the page
 * on each render, so a form sent twice (a double click, a retry after a lost
 * answer) is done once, and the next form, after a success, gets a new key.
 */
export function IdempotencyKey({ value }: { value: string }) {
  return <input type="hidden" name={IDEMPOTENCY_FIELD} value={value} />;
}
