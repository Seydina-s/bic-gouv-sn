import { darkColors, lightColors, type SemanticColors } from "./colors";
import { iconSize, layout, motion, opacity, radius, space, textStyle, touchTarget } from "./scales";

export type ColorScheme = "light" | "dark";

/** User preference in Settings; "system" follows the phone live (default). */
export type ThemePreference = ColorScheme | "system";

const scales = { space, radius, textStyle, iconSize, opacity, motion, touchTarget, layout };

export type Theme = { scheme: ColorScheme; color: SemanticColors } & typeof scales;

function buildTheme(scheme: ColorScheme, color: SemanticColors): Theme {
  return { scheme, color, ...scales };
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
