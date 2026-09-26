import { layout, withAlpha } from "@bgs/ui";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/useTheme";

/**
 * Real blur only where it is cheap: iOS materials (and the web). Android keeps the
 * same glass look, nearly opaque, so entry-level GPUs stay at 60 fps.
 */
export const BLUR_AVAILABLE = Platform.OS !== "android";

/**
 * Frosted-glass layer filling its parent: what lies behind shows through, blurred.
 * Shared by the floating tab bar and the settings sheet, so both look alike.
 */
export function GlassBackdrop({ strength = "glass" }: { strength?: "glass" | "veil" }) {
  const { theme } = useTheme();
  const { color, opacity } = theme;
  const alpha = BLUR_AVAILABLE
    ? strength === "veil"
      ? opacity.veil
      : opacity.glass
    : opacity.glassOpaque;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BLUR_AVAILABLE && (
        <BlurView
          intensity={layout.glassBlur}
          tint={theme.scheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color.glass, alpha) }]} />
    </View>
  );
}
