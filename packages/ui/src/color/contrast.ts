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

function channels(hex: string): [number, number, number] {
  relativeLuminance(hex); // validates the format
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** `hex` at `alpha` opacity, as an rgba() string for translucent surfaces. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

/** Opaque result of `hex` at `alpha` laid over `backdrop` (to check contrast on glass). */
export function composite(hex: string, alpha: number, backdrop: string): string {
  const top = channels(hex);
  const bottom = channels(backdrop);
  const mixed = top.map((value, index) =>
    Math.round(value * alpha + (bottom[index] ?? 0) * (1 - alpha)),
  );
  return `#${mixed
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
