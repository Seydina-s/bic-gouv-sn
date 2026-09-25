// Public build-time variables (see .env.example). Declared so they can be read as
// `process.env.EXPO_PUBLIC_…`, the only form Expo inlines into the bundle.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly EXPO_PUBLIC_SENTRY_DSN?: string;
      readonly EXPO_PUBLIC_APP_ENV?: string;
      readonly EXPO_PUBLIC_API_URL?: string;
    }
  }
}

export {};
