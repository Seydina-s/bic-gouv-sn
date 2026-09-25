// Expo's default Metro config, wrapped by Sentry so release bundles carry the debug
// IDs that match uploaded source maps (readable crash reports). Upload only happens
// in builds where SENTRY_AUTH_TOKEN is set as a secret; never in the repository.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro loads its config as CommonJS
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
