import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";
import { GlassBackdrop } from "./GlassBackdrop";
import { Icon } from "./Icon";

export interface PermissionInvitationProps {
  visible: boolean;
  icon: ComponentType<PhosphorProps>;
  title: string;
  body: string;
  note: string;
  accept: string;
  decline: string;
  onAnswer: (accepted: boolean) => void;
}

/**
 * Asks once, like a phone's permission, before turning something on (decision of
 * 29/09/2026). The yes is coloured, the other answer stays in plain view, same
 * size (decision of the user, 01/10/2026: no trap, it is a public service);
 * "back" means no.
 */
export function PermissionInvitation({
  visible,
  icon,
  title,
  body,
  note,
  accept,
  decline,
  onAnswer,
}: PermissionInvitationProps) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  const button = (label: string, accepted: boolean) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onAnswer(accepted);
      }}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: touchTarget.min,
          borderRadius: radius.md,
          borderColor: accepted ? color.primary : color.borderStrong,
          backgroundColor: accepted
            ? pressed
              ? color.primaryPressed
              : color.primary
            : pressed
              ? color.surface
              : color.background,
        },
      ]}
    >
      <Text style={[textStyle.label, { color: accepted ? color.onPrimary : color.textBrand }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        onAnswer(false);
      }}
    >
      <View style={[styles.root, { padding: space.xl }]}>
        <GlassBackdrop strength="veil" />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              gap: space.lg,
              padding: space.xl,
              borderRadius: radius.lg,
              backgroundColor: color.background,
              maxWidth: layout.readingMaxWidth,
            },
          ]}
        >
          <Icon icon={icon} weight="duotone" color={color.textBrand} />
          <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
            {title}
          </Text>
          <Text style={[textStyle.body, { color: color.textPrimary }]}>{body}</Text>
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{note}</Text>
          <View style={{ gap: space.sm }}>
            {button(accept, true)}
            {button(decline, false)}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { width: "100%" },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
