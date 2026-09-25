/**
 * Raw color scales. Never used directly by screens: go through semantic tokens.
 *
 * Generated once in OKLCH from the exact charter colors (CLAUDE.md §1), which sit
 * unchanged at their natural step: green 600, yellow 100, red 600. Darker yellows
 * drift toward amber so they do not turn khaki.
 */
export const palette = {
  green: {
    50: "#E5FFEA",
    100: "#C2FECF",
    200: "#AAEEB9",
    300: "#8DD99F",
    400: "#69BD80",
    500: "#43A361",
    600: "#00853F",
    700: "#016A31",
    800: "#025124",
    900: "#013817",
  },
  yellow: {
    50: "#FFFBBA",
    100: "#FDEF42",
    200: "#F2DE3E",
    300: "#DEC52E",
    400: "#C3A611",
    500: "#A78904",
    600: "#8A6E04",
    700: "#6E5405",
    800: "#553E01",
    900: "#3D2A02",
  },
  red: {
    50: "#FFF4F2",
    100: "#FEE7E4",
    200: "#FFCDC7",
    300: "#FEABA1",
    400: "#FF796D",
    500: "#F1453F",
    600: "#E31B23",
    700: "#A70411",
    800: "#81000A",
    900: "#5C0105",
  },
  /** Near-grey with a faint green tint, so neutrals sit well next to the brand green. */
  neutral: {
    0: "#FFFFFF",
    50: "#F3F8F4",
    100: "#E9EEEA",
    200: "#D7DCD8",
    300: "#C0C6C1",
    400: "#A4A9A5",
    500: "#898E8A",
    // Tuned from #6E736F (4.498:1 on neutral 50) so metadata text passes AA on every surface.
    600: "#6D716E",
    700: "#555956",
    800: "#3F4440",
    900: "#2B2F2C",
    /** 925 and 940: dark-theme tonal surfaces, so stacked layers stay distinguishable. */
    925: "#232824",
    940: "#1A201B",
    950: "#131714",
  },
} as const;

/** Exact flag colors from the charter. */
export const CHARTER_COLORS = {
  green: palette.green[600],
  yellow: palette.yellow[100],
  red: palette.red[600],
  white: palette.neutral[0],
} as const;
