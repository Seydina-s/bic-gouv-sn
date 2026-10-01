import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, type ComponentType } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryProvider } from "../data/QueryProvider";
import { DataSaverProvider } from "../features/data-saver/DataSaverProvider";
import { UsageStatsProvider } from "../features/usage-stats/UsageStatsProvider";
import { NotificationsProvider } from "../features/notifications/NotificationsProvider";
import { useNotificationTaps } from "../features/notifications/useNotificationTaps";
import { UpdateGate } from "../features/remote-config/FeatureGate";
import { SettingsProvider } from "../features/shell/SettingsProvider";
import { FavoritesProvider } from "../features/favorites/FavoritesProvider";
import { LocationProvider } from "../features/location/LocationProvider";
import { OnboardingLayer } from "../features/onboarding/OnboardingLayer";
import { OnboardingProvider, useOnboardingDone } from "../features/onboarding/OnboardingProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import { useDocumentLanguage } from "../i18n/language";
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
  const onboarding = useOnboardingDone();
  const ready = fontsReady && onboarding.done !== null;
  useDocumentLanguage();
  useNotificationTaps();

  // Root background behind every screen: no white flash in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.background);
  }, [theme.color.background]);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
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
      {/* First run: welcome screens above the app (the navigator stays mounted). */}
      {onboarding.done === false && <OnboardingLayer onFinish={onboarding.finish} />}
    </>
  );
}

function RootLayout() {
  return (
    // Native gestures everywhere (the sliding panel of "Près de moi").
    <GestureHandlerRootView style={styles.fill}>
      <QueryProvider>
        <ThemeProvider>
          <I18nProvider>
            <FavoritesProvider>
              <DataSaverProvider>
                <UsageStatsProvider>
                  <NotificationsProvider>
                    <LocationProvider>
                      <OnboardingProvider>
                        <SettingsProvider>
                          <UpdateGate>
                            <ThemedStack />
                          </UpdateGate>
                        </SettingsProvider>
                      </OnboardingProvider>
                    </LocationProvider>
                  </NotificationsProvider>
                </UsageStatsProvider>
              </DataSaverProvider>
            </FavoritesProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap adds an error boundary and touch breadcrumbs, only when monitoring is on.
const MonitoredRootLayout: ComponentType = monitoringEnabled ? Sentry.wrap(RootLayout) : RootLayout;

export default function Layout() {
  return <MonitoredRootLayout />;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
