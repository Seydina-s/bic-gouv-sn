import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, type ComponentType } from "react";
import { QueryProvider } from "../data/QueryProvider";
import { FavoritesProvider } from "../features/favorites/FavoritesProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import { initMonitoring } from "../monitoring/monitoring";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/useAppFonts";
import { useTheme } from "../theme/useTheme";

// Crash reporting starts first, so a crash during startup is still reported.
// EXPO_PUBLIC_* values must be read literally to be inlined at build time.
const monitoringEnabled = initMonitoring({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV,
});

// Keep the native splash visible until fonts are ready: no white screen, no font swap.
void SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { theme } = useTheme();
  const fontsReady = useAppFonts();

  // Root background behind every screen: no white flash in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.background);
  }, [theme.color.background]);

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.background },
        }}
      />
    </>
  );
}

function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <FavoritesProvider>
            <ThemedStack />
          </FavoritesProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

// Sentry.wrap adds an error boundary and touch breadcrumbs, only when monitoring is on.
const MonitoredRootLayout: ComponentType = monitoringEnabled ? Sentry.wrap(RootLayout) : RootLayout;

export default function Layout() {
  return <MonitoredRootLayout />;
}
