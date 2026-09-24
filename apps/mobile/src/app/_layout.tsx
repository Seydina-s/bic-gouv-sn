import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useTheme } from "../theme/useTheme";

function ThemedStack() {
  const { theme } = useTheme();

  // Root background behind every screen: no white flash in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.background);
  }, [theme.color.background]);

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
