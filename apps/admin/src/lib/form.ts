/** A text field of a submitted form; "" when absent or not text (e.g. a file). */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Name of the hidden field carrying a form's idempotency key (IdempotencyKey). */
export const IDEMPOTENCY_FIELD = "idempotencyKey";

/** The form's idempotency key, or null when absent or malformed (then sent without). */
export function formIdempotencyKey(form: FormData): string | null {
  const key = formText(form, IDEMPOTENCY_FIELD);
  return /^[A-Za-z0-9_-]{16,128}$/.test(key) ? key : null;
}

/** Every text value of a repeated field (e.g. checked boxes), empty ones left out. */
export function formTexts(form: FormData, name: string): string[] {
  return form
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value !== "");
}
