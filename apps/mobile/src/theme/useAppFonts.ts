// Per-weight imports: importing the package root would bundle all 14 weights (~1.3 MB).
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import type { fontFace } from "@bgs/ui";
import { useFonts } from "expo-font";

/** Every face declared in the design tokens, registered under the same name. */
const faces: Record<(typeof fontFace)[keyof typeof fontFace], number> = {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
};

/**
 * True once the fonts are usable. A loading failure also counts as ready:
 * the app then renders with the system font rather than staying blocked.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(faces);
  return loaded || error !== null;
}
