import { resolveColorScheme, themes, type Theme, type ThemePreference } from "@bgs/ui";
import { createContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { usePersistentChoice } from "../data/usePersistentChoice";
import { useThemeTransition } from "./ThemeFade";

const PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Follows the phone's light/dark mode live (useColorScheme re-renders on change),
 * unless the user forced a scheme in Settings. Default: "system".
 * The choice is remembered on the phone. A change of mode cross-fades the screen.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = usePersistentChoice("bgs-theme", PREFERENCES, "system");

  const { theme, layer } = useThemeTransition(themes[resolveColorScheme(preference, systemScheme)]);

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference],
  );

  return (
    <ThemeContext value={value}>
      {children}
      {layer}
    </ThemeContext>
  );
}
