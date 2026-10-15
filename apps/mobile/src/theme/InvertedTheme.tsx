import { themes } from "@bgs/ui";
import { useMemo, type ReactNode } from "react";
import { ThemeContext } from "./ThemeProvider";
import { useTheme } from "./useTheme";

/**
 * Its children in the opposite mode (dark in light mode, light in dark mode), for one
 * element that must stand out from what lies under it: the tab bar over the map's
 * panel (owner's request, 15/10/2026). Off, the children keep the app's mode.
 */
export function InvertedTheme({ when, children }: { when: boolean; children: ReactNode }) {
  const context = useTheme();
  const value = useMemo(
    () => ({ ...context, theme: themes[context.theme.scheme === "dark" ? "light" : "dark"] }),
    [context],
  );
  return when ? <ThemeContext value={value}>{children}</ThemeContext> : children;
}
