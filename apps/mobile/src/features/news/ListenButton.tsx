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

/** The phone's French voice: every phone has one; none ships a Wolof voice yet. */
export const FRENCH_VOICE = "fr-FR";
const VOICES: Partial<Record<NewsDetail["lang"], string>> = { fr: FRENCH_VOICE };

/** True when this article can be read aloud on the phone. */
export function canListen(detail: NewsDetail): boolean {
  return VOICES[detail.lang] !== undefined;
}

/** The article's "Écouter": its title, then its text. */
export function ListenButton({ detail }: { detail: NewsDetail }) {
  return (
    <ReadAloudButton
      language={VOICES[detail.lang] ?? FRENCH_VOICE}
      pieces={() => spokenPieces(detail.title, detail.blocks, Speech.maxSpeechInputLength)}
    />
  );
}

/**
 * "Écouter" pill on glass (it reads over any picture, as on an article photo).
 * Becomes "Arrêter" while reading. `pieces` is only computed when pressed.
 */
export function ReadAloudButton({
  language,
  pieces,
}: {
  language: string;
  pieces: () => readonly string[];
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { speaking, start, stop } = useReadAloud(language);
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
          start(pieces());
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
