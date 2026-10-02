import { darkServiceTones, lightServiceTones, type ServiceTones } from "./service-tones";
import { darkCategoryTones, lightCategoryTones, type CategoryTones } from "./category-tones";
import { darkColors, lightColors, type SemanticColors } from "./colors";
import {
  borderWidth,
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
  borderWidth,
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
  /** One tone per kind of state service: map markers and list badges. */
  serviceTones: ServiceTones;
} & typeof scales;

function buildTheme(
  scheme: ColorScheme,
  color: SemanticColors,
  categoryTones: CategoryTones,
  serviceTones: ServiceTones,
): Theme {
  return { scheme, color, categoryTones, serviceTones, ...scales };
}

export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: buildTheme("light", lightColors, lightCategoryTones, lightServiceTones),
  dark: buildTheme("dark", darkColors, darkCategoryTones, darkServiceTones),
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
