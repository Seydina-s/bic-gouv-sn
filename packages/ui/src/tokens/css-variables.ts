import type { Theme } from "./theme";

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function prefixed(category: string, values: Readonly<Record<string, string | number>>) {
  return Object.entries(values).map(([name, value]) => {
    const cssValue = typeof value === "number" ? `${String(value)}px` : value;
    return [`--bgs-${category}-${toKebabCase(name)}`, cssValue] as const;
  });
}

/** CSS custom properties for the admin (web), e.g. --bgs-color-primary. */
export function toCssVariables(theme: Theme): Record<string, string> {
  return Object.fromEntries([
    ...prefixed("color", { ...theme.color }),
    ...prefixed("space", theme.space),
    ...prefixed("radius", theme.radius),
  ]);
}
