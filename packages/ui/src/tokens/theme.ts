import { darkColors, lightColors, type SemanticColors } from "./colors";
import { font, motion, radius, space, touchTarget } from "./scales";

export type ColorScheme = "light" | "dark";

/** User preference in Settings; "system" follows the phone live (default). */
export type ThemePreference = ColorScheme | "system";

export interface Theme {
  scheme: ColorScheme;
  color: SemanticColors;
  space: typeof space;
  radius: typeof radius;
  font: typeof font;
  motion: typeof motion;
  touchTarget: typeof touchTarget;
}

function buildTheme(scheme: ColorScheme, color: SemanticColors): Theme {
  return { scheme, color, space, radius, font, motion, touchTarget };
}

export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: buildTheme("light", lightColors),
  dark: buildTheme("dark", darkColors),
};

/**
 * Picks the active scheme. The system value can be null or "unspecified"
 * on some devices: light is then used.
 */
export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference !== "system") {
    return preference;
  }
  return systemScheme === "dark" ? "dark" : "light";
}
