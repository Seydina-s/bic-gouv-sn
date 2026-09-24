import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/useAppFonts";
import { useTheme } from "../theme/useTheme";

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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ThemedStack />
      </I18nProvider>
    </ThemeProvider>
  );
}
