import { errorReportTags } from "@bgs/shared-types";
import * as Sentry from "@sentry/node";
import type { Config } from "./config";

/** Adds the catalog code to a report, so the admin can explain it in plain French. */
export function tagWithErrorCode(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
  const tags = errorReportTags(hint.originalException);
  if (Object.keys(tags).length > 0) {
    event.tags = { ...event.tags, ...tags };
  }
  return event;
}

/**
 * Starts crash reporting when a DSN is configured; does nothing otherwise.
 * Personal data stays out of reports (CDP / law 2008-12): no IP, no cookies, no headers.
 */
export function initMonitoring(config: Config, release: string): boolean {
  if (config.SENTRY_DSN === undefined) {
    return false;
  }
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    release: `bic-gouv-sn-api@${release}`,
    sendDefaultPii: false,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    beforeSend: tagWithErrorCode,
  });
  return true;
}
