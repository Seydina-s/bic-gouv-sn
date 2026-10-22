import { tracking } from "@bgs/ui";
import { StyleSheet, Text, type TextProps } from "react-native";
import { useTranslation } from "../i18n/useTranslation";

/**
 * A label in capitals, written so in its words rather than by `textTransform`: Android
 * measured the lower-case words, then drew them in capitals, wider, and cut the end
 * ("INTERVIEWS &" for "Interviews & reportages", owner's report of 22/10/2026). Screen
 * readers hear the words as written, not spelled out.
 */
export function CapsText({ children, style, ...props }: TextProps & { children: string }) {
  const { lang } = useTranslation();
  return (
    <Text accessibilityLabel={children} {...props} style={[styles.caps, style]}>
      {children.toLocaleUpperCase(lang)}
    </Text>
  );
}

const styles = StyleSheet.create({
  caps: { letterSpacing: tracking.caps },
});
