// Expo's default Metro config, wrapped by Sentry so release bundles carry the debug
// IDs that match uploaded source maps (readable crash reports). Upload only happens
// in builds where SENTRY_AUTH_TOKEN is set as a secret; never in the repository.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro loads its config as CommonJS
const path = require("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro loads its config as CommonJS
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Bundle weight (PERF-05): Sentry's web session replay, never enabled here (no
// screenshots, CDP / law 2008-12), is left out of every bundle (-134 KB).
const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });

/**
 * Bundle weight (PERF-03): Zod's catalogue of translated error messages is replaced
 * by an empty module (-275 KB). Only this exact import from inside Zod is redirected.
 */
const ZOD_LOCALES_STUB = path.join(__dirname, "src", "stubs", "zod-locales.js");
const insideZod = /[\\/]zod[\\/]v4[\\/](?:classic|core)[\\/]/;
/**
 * Bundle weight (PERF-01): Expo Router's native tabs, unused here, import expo-symbols,
 * which bundles the Material Symbols font on Android (-966 KB). Only that import is
 * redirected; any direct use of expo-symbols elsewhere would resolve normally.
 */
const EXPO_SYMBOLS_STUB = path.join(__dirname, "src", "stubs", "expo-symbols.js");
const insideRouterNativeTabs = /[\\/]expo-router[\\/]build[\\/]native-tabs[\\/]/;
/**
 * Bundle weight (PERF-09): Sentry's web feedback widget, never shown (the mobile SDK
 * has its own), is replaced where @sentry/browser imports it (-47 KB).
 */
const SENTRY_FEEDBACK_STUB = path.join(__dirname, "src", "stubs", "sentry-feedback.js");
const insideSentryBrowser = /[\\/]@sentry[\\/]browser[\\/]/;
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "../locales/index.js" && insideZod.test(context.originModulePath)) {
    return { type: "sourceFile", filePath: ZOD_LOCALES_STUB };
  }
  if (moduleName === "expo-symbols" && insideRouterNativeTabs.test(context.originModulePath)) {
    return { type: "sourceFile", filePath: EXPO_SYMBOLS_STUB };
  }
  if (
    moduleName === "@sentry-internal/feedback" &&
    insideSentryBrowser.test(context.originModulePath)
  ) {
    return { type: "sourceFile", filePath: SENTRY_FEEDBACK_STUB };
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
