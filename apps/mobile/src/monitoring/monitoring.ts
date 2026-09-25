import { errorReportTags } from "@bgs/shared-types";
import * as Sentry from "@sentry/react-native";

export interface MonitoringSettings {
  /** Public Sentry key (EXPO_PUBLIC_SENTRY_DSN): not a secret, but never hard-coded. */
  dsn: string | undefined;
  environment: string | undefined;
}

// The hint type is not exported by @sentry/react-native: derive it from the SDK options.
type BeforeSend = NonNullable<Sentry.ReactNativeOptions["beforeSend"]>;
type EventHint = Parameters<BeforeSend>[1];

/** Adds the catalog code to a crash report, so the admin can explain it in plain French. */
export function tagWithErrorCode(event: Sentry.ErrorEvent, hint: EventHint) {
  const tags = errorReportTags(hint.originalException);
  if (Object.keys(tags).length > 0) {
    event.tags = { ...event.tags, ...tags };
  }
  return event;
}

/**
 * Starts crash reporting when a DSN is provided; does nothing otherwise. Sessions are
 * tracked to measure crash-free sessions (target > 99.5 %). No personal data: no IP,
 * no screenshots, no view hierarchy (CDP / law 2008-12).
 */
export function initMonitoring({ dsn, environment }: MonitoringSettings): boolean {
  if (dsn === undefined || dsn === "") {
    return false;
  }
  Sentry.init({
    dsn,
    environment: environment ?? "development",
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.02,
    beforeSend: tagWithErrorCode,
  });
  return true;
}
