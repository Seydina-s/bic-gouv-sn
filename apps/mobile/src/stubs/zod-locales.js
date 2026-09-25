// Stand-in for zod/v4/locales/index.js in the app bundle (see metro.config.js).
// Zod ships its error messages in 60+ languages (≈ 275 KB of JavaScript); the app
// never shows Zod messages to people and never switches Zod's locale. The English
// messages Zod uses by default are imported separately and stay in the bundle.
export {};
