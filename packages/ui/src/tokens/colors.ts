import { palette } from "./palette";

const { green, yellow, red, neutral } = palette;

/** Semantic colors: the only colors screens may use. */
export interface SemanticColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  /** Borders that must stay visible (inputs, outlined buttons): ≥ 3:1. */
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  /** Green for titles, links and active icons on the background. */
  textBrand: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  /** Green bars (header, tab bar highlight). */
  brandSurface: string;
  onBrandSurface: string;
  /** Yellow on brand surface: large text (subtitles) and icons only. */
  accentOnBrandSurface: string;
  /** Yellow badges; text inside uses onAccent. */
  accent: string;
  onAccent: string;
  danger: string;
  onDanger: string;
  dangerSurface: string;
  onDangerSurface: string;
  focusRing: string;
}

export const lightColors: SemanticColors = {
  background: neutral[0],
  surface: neutral[50],
  surfaceRaised: neutral[0],
  border: neutral[200],
  borderStrong: neutral[600],
  textPrimary: neutral[900],
  textSecondary: neutral[700],
  // green[600] is only 4.41:1 on `surface`: one step darker keeps small green text readable.
  textBrand: green[700],
  primary: green[600],
  primaryPressed: green[700],
  onPrimary: neutral[0],
  brandSurface: green[600],
  onBrandSurface: neutral[0],
  accentOnBrandSurface: yellow[100],
  accent: yellow[100],
  onAccent: neutral[900],
  danger: red[600],
  onDanger: neutral[0],
  dangerSurface: red[50],
  onDangerSurface: red[700],
  focusRing: green[600],
};

export const darkColors: SemanticColors = {
  background: neutral[950],
  surface: neutral[900],
  surfaceRaised: neutral[800],
  border: neutral[800],
  borderStrong: neutral[500],
  textPrimary: neutral[50],
  textSecondary: neutral[300],
  textBrand: green[400],
  primary: green[400],
  primaryPressed: green[300],
  onPrimary: neutral[950],
  brandSurface: green[800],
  onBrandSurface: neutral[0],
  accentOnBrandSurface: yellow[100],
  accent: yellow[100],
  onAccent: neutral[950],
  danger: red[400],
  onDanger: neutral[950],
  dangerSurface: red[900],
  onDangerSurface: red[200],
  focusRing: green[400],
};
