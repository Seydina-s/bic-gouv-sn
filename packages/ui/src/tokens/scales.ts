/**
 * Theme-independent scales. Lengths are density-independent pixels (dp);
 * font sizes are scale-independent (sp) and follow the system text size.
 */

/** 4 dp rhythm. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
} as const;

/** Minimum touch target (CLAUDE.md §1, accessibility). */
export const touchTarget = { min: 48 } as const;

export const iconSize = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export const opacity = {
  /** Disabled controls (Material 3). */
  disabled: 0.38,
  /** Pressed overlay on cards and list rows. */
  pressed: 0.12,
  /** Scrim behind modals and sheets. */
  scrim: 0.6,
  /** Frosted-glass bars where the system blurs what scrolls beneath (iOS). */
  glass: 0.82,
  /** Same bars without blur (Android: blur is too costly on entry-level GPUs). */
  glassOpaque: 0.94,
} as const;

/**
 * Font faces, one per weight: on Android, `fontWeight` does not select a weight
 * of a custom family, so each weight is its own face. Names match the keys the
 * app registers with expo-font. Provisional families from the reference mockup
 * (OFL, all Wolof glyphs verified), pending the typography comparison (S1-04).
 */
export const fontFace = {
  displaySemibold: "BricolageGrotesque_600SemiBold",
  displayBold: "BricolageGrotesque_700Bold",
  displayExtrabold: "BricolageGrotesque_800ExtraBold",
  bodyRegular: "Manrope_400Regular",
  bodySemibold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
  /** Newspaper serif for headlines ("La Une", D-05): Literata, OFL, Wolof glyphs verified. */
  serifSemibold: "Literata_600SemiBold",
  serifBold: "Literata_700Bold",
} as const;

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  /** Absolute value, as React Native expects. */
  lineHeight: number;
}

/**
 * Type roles (Material 3 naming, trimmed to what the app needs). Line heights
 * keep ≥ 1.25× the size so Wolof and French diacritics (É, Ë, Ñ, Ŋ) never clip.
 * Body stays at 16 sp; 12 sp is reserved for short labels, never for reading.
 */
export const textStyle = {
  display: { fontFamily: fontFace.displayExtrabold, fontSize: 34, lineHeight: 44 },
  headline: { fontFamily: fontFace.displayBold, fontSize: 28, lineHeight: 36 },
  /** Front-page headline of the lead story. */
  leadHeadline: { fontFamily: fontFace.serifBold, fontSize: 26, lineHeight: 34 },
  title: { fontFamily: fontFace.displaySemibold, fontSize: 22, lineHeight: 30 },
  subtitle: { fontFamily: fontFace.bodyBold, fontSize: 18, lineHeight: 26 },
  /** Headline of a story in the list or a highlighted card. */
  storyTitle: { fontFamily: fontFace.serifSemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFace.bodyRegular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: fontFace.bodyRegular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFace.bodySemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFace.bodySemibold, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

/**
 * Durations in ms (exits ≈ 70 % of enters so the UI feels responsive), easing as
 * cubic-bezier points, springs for gesture-driven motion (Reanimated). When the
 * system "reduce motion" setting is on, movement is replaced by a crossfade or cut.
 */
export const motion = {
  duration: {
    fast: 120,
    normal: 220,
    slow: 360,
    exitFast: 90,
    exitNormal: 160,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.3, 0, 0, 1],
  },
  spring: {
    /** Taps, toggles, small elements. */
    snappy: { damping: 20, stiffness: 300, mass: 1 },
    /** Sheets, cards, screen-level movement. */
    gentle: { damping: 26, stiffness: 180, mass: 1 },
  },
} as const;

/**
 * Window size classes (Material): layouts switch on width, recomputed live on
 * rotation, fold/unfold and multi-window. Never on device type.
 */
export const breakpoint = {
  /** Phones, folded foldables. */
  compact: 0,
  /** Small tablets, unfolded foldables, large phones in landscape: two panes possible. */
  medium: 600,
  /** Tablets and desktops: list + detail side by side. */
  expanded: 840,
} as const;

export type WindowClass = keyof typeof breakpoint;

export function windowClass(width: number): WindowClass {
  if (width >= breakpoint.expanded) {
    return "expanded";
  }
  return width >= breakpoint.medium ? "medium" : "compact";
}

export const layout = {
  /** Comfortable reading measure (≈ 65 characters at body size). */
  readingMaxWidth: 640,
  /** Side of the square photo next to a feed title. */
  thumbnail: 72,
  /** Frame of a lead or article cover photo (cropped, never distorted). */
  coverAspectRatio: 16 / 9,
} as const;
