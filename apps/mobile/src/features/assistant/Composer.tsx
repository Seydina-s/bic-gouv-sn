import { ASSISTANT_QUESTION_MAX, ASSISTANT_QUESTION_MIN } from "@bgs/shared-types";
import { ArrowUpIcon as ArrowUp } from "phosphor-react-native/src/icons/ArrowUp";
import { MicrophoneIcon as Microphone } from "phosphor-react-native/src/icons/Microphone";
import { StopIcon as Stop } from "phosphor-react-native/src/icons/Stop";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import type { VoiceProblem } from "./useVoiceInput";

const ACTION = 44;

/** A soft ring around the stop button while the phone listens (still with reduced motion). */
function ListeningRing({ color }: { color: string }) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = reduceMotion !== false ? 0 : withRepeat(withTiming(1, { duration: 1100 }), -1);
  }, [reduceMotion, pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.5 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: ACTION / 2, backgroundColor: color }, style]}
    />
  );
}

/**
 * Where the person writes or dictates, as in the best chat apps: one field for a
 * question or a claim to check, and the microphone, which becomes the send arrow as
 * soon as there is something to send.
 */
export function Composer({
  value,
  onChange,
  onSend,
  busy,
  listening,
  onListen,
  onStopListening,
  voiceProblem,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  listening: boolean;
  onListen: () => void;
  onStopListening: () => void;
  voiceProblem: VoiceProblem | null;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const ready = value.trim().length >= ASSISTANT_QUESTION_MIN && !busy;
  const showSend = value.trim() !== "" && !listening;

  return (
    <View style={{ gap: space.xs }}>
      {voiceProblem !== null && (
        <Text
          accessibilityRole="alert"
          style={[textStyle.bodySmall, { color: color.textSecondary, paddingHorizontal: space.sm }]}
        >
          {t(`assistant.voice.${voiceProblem}`)}
        </Text>
      )}
      <View
        style={[
          styles.card,
          {
            gap: space.xs,
            paddingTop: space.sm,
            paddingBottom: space.xs,
            paddingHorizontal: space.xs,
            borderRadius: radius.lg,
            borderColor: listening ? color.primary : color.border,
            backgroundColor: color.surfaceRaised,
            shadowColor: color.scrim,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={t("assistant.placeholder")}
          accessibilityHint={t("assistant.personal")}
          value={value}
          onChangeText={onChange}
          multiline
          maxLength={ASSISTANT_QUESTION_MAX}
          editable={!listening}
          placeholder={listening ? t("assistant.listening") : t("assistant.placeholder")}
          placeholderTextColor={color.textTertiary}
          style={[
            textStyle.body,
            styles.field,
            { color: color.textPrimary, paddingHorizontal: space.md, minHeight: touchTarget.min },
          ]}
        />
        <View style={[styles.row, { gap: space.sm }]}>
          <View style={styles.flex} />
          {showSend ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("assistant.send")}
              accessibilityState={{ disabled: !ready, busy }}
              disabled={!ready}
              onPress={onSend}
              hitSlop={(touchTarget.min - ACTION) / 2}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: pressed ? color.primaryPressed : color.primary,
                  opacity: ready ? 1 : theme.opacity.disabled,
                },
              ]}
            >
              <Icon icon={ArrowUp} size="md" weight="bold" color={color.onPrimary} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? t("assistant.stopListening") : t("assistant.speak")}
              onPress={listening ? onStopListening : onListen}
              hitSlop={(touchTarget.min - ACTION) / 2}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: listening
                    ? color.primary
                    : pressed
                      ? color.primaryContainer
                      : color.surface,
                },
              ]}
            >
              {listening && <ListeningRing color={color.primary} />}
              <Icon
                icon={listening ? Stop : Microphone}
                size="md"
                weight={listening ? "fill" : "regular"}
                color={listening ? color.onPrimary : color.textBrand}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  field: { maxHeight: 140, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  action: {
    width: ACTION,
    height: ACTION,
    borderRadius: ACTION / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
