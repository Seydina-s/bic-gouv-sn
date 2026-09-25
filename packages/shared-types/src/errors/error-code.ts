import { describeError } from "./error-catalog";

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/** Catalog code carried by an error (`error.code`), if any. */
export function errorCodeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const code: unknown = Reflect.get(error, "code");
  return typeof code === "string" && CODE_PATTERN.test(code) ? code : undefined;
}

/**
 * Tags for a crash report (Sentry or other), so the admin can show the
 * plain-language explanation next to it and spot codes missing from the catalog.
 */
export function errorReportTags(error: unknown): Record<string, string> {
  const code = errorCodeOf(error);
  if (code === undefined) {
    return {};
  }
  return { "error.code": code, "error.catalogued": String(describeError(code).catalogued) };
}
