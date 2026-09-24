/** WCAG 2.2 contrast helpers for opaque #RRGGBB colors. */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  if (!HEX_COLOR.test(hex)) {
    throw new Error(`Expected an opaque #RRGGBB color, received "${hex}"`);
  }
  const [r, g, b] = [1, 3, 5].map((start) =>
    channelToLinear(Number.parseInt(hex.slice(start, start + 2), 16)),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA minimums: 4.5 for body text, 3 for large text and UI components. */
export const WCAG_AA = { text: 4.5, largeText: 3, uiComponent: 3 } as const;
