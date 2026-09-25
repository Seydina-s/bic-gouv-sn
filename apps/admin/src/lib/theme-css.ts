import { CHARTER_COLORS, themes, toCssVariables } from "@bgs/ui";

function declarations(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
}

/** Exact flag colors, identical in both themes (e.g. the header's tricolor band). */
const flag = declarations({
  "--bgs-flag-green": CHARTER_COLORS.green,
  "--bgs-flag-yellow": CHARTER_COLORS.yellow,
  "--bgs-flag-red": CHARTER_COLORS.red,
});

/**
 * Design tokens as CSS custom properties: light by default, dark following the
 * operating system live (prefers-color-scheme), from the same source as the app.
 */
export function themeCss(): string {
  const light = declarations(toCssVariables(themes.light));
  const dark = declarations(toCssVariables(themes.dark));
  return `:root{color-scheme:light;${flag}${light}}@media (prefers-color-scheme: dark){:root{color-scheme:dark;${dark}}}`;
}
