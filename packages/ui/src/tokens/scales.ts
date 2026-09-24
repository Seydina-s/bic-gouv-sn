/** Theme-independent scales. Values are density-independent pixels (dp). */

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

/**
 * Provisional families from the reference mockup, pending the typography
 * comparison (backlog S1-04). Sizes scale with the system font size setting.
 */
export const font = {
  family: {
    display: "BricolageGrotesque",
    body: "Manrope",
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
  },
} as const;

/** Durations in milliseconds; easing as cubic-bezier control points. */
export const motion = {
  duration: {
    fast: 120,
    normal: 220,
    slow: 360,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.3, 0, 0, 1],
  },
} as const;
