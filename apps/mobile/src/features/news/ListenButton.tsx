import type { NewsDetail } from "@bgs/shared-types";
import * as Speech from "expo-speech";
import { SpeakerHighIcon as SpeakerHigh } from "phosphor-react-native/src/icons/SpeakerHigh";
import { StopIcon as Stop } from "phosphor-react-native/src/icons/Stop";
import { Pressable, StyleSheet, Text } from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { spokenPieces } from "./spoken-text";
import { useReadAloud } from "./useReadAloud";

/** Voices the phone has: French everywhere; no phone ships a Wolof voice yet. */
const VOICES: Partial<Record<NewsDetail["lang"], string>> = { fr: "fr-FR" };

/** True when this article can be read aloud on the phone. */
export function canListen(detail: NewsDetail): boolean {
  return VOICES[detail.lang] !== undefined;
}

/**
 * "Écouter" pill, set in the top right corner of the article photo (on glass, so
 * it reads over any picture). Becomes "Arrêter" while the article is being read.
 */
export function ListenButton({ detail }: { detail: NewsDetail }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { speaking, start, stop } = useReadAloud(VOICES[detail.lang] ?? "fr-FR");
  const { color, space, textStyle, radius, touchTarget } = theme;
  const label = speaking ? t("content.stopListening") : t("content.listen");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: speaking }}
      onPress={() => {
        if (speaking) {
          stop();
        } else {
          start(spokenPieces(detail.title, detail.blocks, Speech.maxSpeechInputLength));
        }
      }}
      style={({ pressed }) => [
        styles.pill,
        {
          minHeight: touchTarget.min,
          paddingHorizontal: space.lg,
          gap: space.sm,
          borderRadius: radius.full,
          borderColor: color.glassBorder,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      <GlassBackdrop />
      <Icon icon={speaking ? Stop : SpeakerHigh} weight="fill" color={color.textBrand} />
      <Text style={[textStyle.label, { color: color.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
