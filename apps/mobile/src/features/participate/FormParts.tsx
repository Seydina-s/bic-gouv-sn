import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import type { SendingState } from "./useSending";

/** The longest message the API accepts. */
export const MAX_TEXT = 2000;
/** The shortest one: a few words. */
export const MIN_TEXT = 10;

/** A labelled text field; multiline ones count what is left. */
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  maxLength: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  return (
    <View style={{ gap: space.xs }}>
      <Text style={[textStyle.label, { color: color.textPrimary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={color.textTertiary}
        style={[
          textStyle.body,
          {
            color: color.textPrimary,
            minHeight: multiline ? touchTarget.min * 3 : touchTarget.min,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: color.borderStrong,
            backgroundColor: color.background,
          },
        ]}
      />
      {multiline && (
        <Text style={[textStyle.caption, styles.count, { color: color.textTertiary }]}>
          {t("participate.count", { count: value.length })}
        </Text>
      )}
    </View>
  );
}

/** "Envoyer", then what happened, in plain words. */
export function SendRow({
  state,
  ready,
  sentMessage,
  onSend,
}: {
  state: SendingState;
  ready: boolean;
  sentMessage: string;
  onSend: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const sending = state.phase === "sending";
  const enabled = ready && !sending;
  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled, busy: sending }}
        disabled={!enabled}
        onPress={onSend}
        style={({ pressed }) => [
          styles.send,
          {
            minHeight: touchTarget.min,
            borderRadius: radius.md,
            backgroundColor: pressed ? color.primaryPressed : color.primary,
            opacity: enabled ? 1 : theme.opacity.disabled,
          },
        ]}
      >
        <Text style={[textStyle.label, { color: color.onPrimary }]}>
          {t(sending ? "participate.sending" : "participate.send")}
        </Text>
      </Pressable>
      {state.phase === "sent" && (
        <Text accessibilityRole="alert" style={[textStyle.body, { color: color.textBrand }]}>
          {sentMessage}
        </Text>
      )}
      {state.phase === "failed" && (
        <Text accessibilityRole="alert" style={[textStyle.body, { color: color.danger }]}>
          {t(`participate.errors.${state.failure}`)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  count: { alignSelf: "flex-end" },
  send: { alignItems: "center", justifyContent: "center" },
});
