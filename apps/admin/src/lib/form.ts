/** A text field of a submitted form; "" when absent or not text (e.g. a file). */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Every text value of a repeated field (e.g. checked boxes), empty ones left out. */
export function formTexts(form: FormData, name: string): string[] {
  return form
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value !== "");
}
