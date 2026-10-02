// Stand-in for @sentry-internal/feedback when @sentry/browser imports it (see
// metro.config.js). It is Sentry's web feedback widget (≈ 47 KB); the app never
// shows it, and the mobile SDK has its own. @sentry/browser builds its feedback
// integrations when loaded, so the builders exist; using one would fail loudly.
function unavailable() {
  throw new Error("Sentry's web feedback widget is not part of this app");
}

export function buildFeedbackIntegration() {
  return unavailable;
}

export const feedbackModalIntegration = unavailable;
export const feedbackScreenshotIntegration = unavailable;
export const sendFeedback = unavailable;

export function getFeedback() {
  return undefined;
}
