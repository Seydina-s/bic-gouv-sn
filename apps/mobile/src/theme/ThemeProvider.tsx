import { resolveColorScheme, themes, type Theme, type ThemePreference } from "@bgs/ui";
import { createContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Follows the phone's light/dark mode live (useColorScheme re-renders on change),
 * unless the user forced a scheme in Settings. Default: "system".
 * The preference is kept in memory for now; persisted with local storage later.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  const value = useMemo(
    () => ({
      theme: themes[resolveColorScheme(preference, systemScheme)],
      preference,
      setPreference,
    }),
    [preference, systemScheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
