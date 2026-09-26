import { darkCategoryTones, lightCategoryTones, type CategoryTones } from "./category-tones";
import { darkColors, lightColors, type SemanticColors } from "./colors";
import {
  iconSize,
  layout,
  motion,
  opacity,
  radius,
  space,
  textStyle,
  touchTarget,
  tracking,
} from "./scales";

export type ColorScheme = "light" | "dark";

/** User preference in Settings; "system" follows the phone live (default). */
export type ThemePreference = ColorScheme | "system";

const scales = {
  space,
  radius,
  textStyle,
  tracking,
  iconSize,
  opacity,
  motion,
  touchTarget,
  layout,
};

export type Theme = {
  scheme: ColorScheme;
  color: SemanticColors;
  categoryTones: CategoryTones;
} & typeof scales;

function buildTheme(
  scheme: ColorScheme,
  color: SemanticColors,
  categoryTones: CategoryTones,
): Theme {
  return { scheme, color, categoryTones, ...scales };
}

export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: buildTheme("light", lightColors, lightCategoryTones),
  dark: buildTheme("dark", darkColors, darkCategoryTones),
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
