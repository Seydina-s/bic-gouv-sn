import { ChartBarIcon as ChartBar } from "phosphor-react-native/src/icons/ChartBar";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { useUsageStats } from "./UsageStatsProvider";

/**
 * Asks once, like a phone's permission, whether anonymous statistics may be
 * counted (AUD4-03, decision of 29/09/2026: yes turns them on at once). Shown only
 * after a first article read, never during the welcome screens. Both answers
 * weigh the same: same size, same style, no default; "back" means no.
 */
export function UsageStatsInvitation({ visible }: { visible: boolean }) {
  const { invitationDue, answerInvitation } = useUsageStats();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  const answer = (accepted: boolean) => () => {
    answerInvitation(accepted);
  };
  const button = (label: string, accepted: boolean) => (
    <Pressable
      accessibilityRole="button"
      onPress={answer(accepted)}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: touchTarget.min,
          borderRadius: radius.md,
          borderColor: color.borderStrong,
          backgroundColor: pressed ? color.surface : color.background,
        },
      ]}
    >
      <Text style={[textStyle.label, { color: color.textBrand }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible && invitationDue}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={answer(false)}
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
          <Icon icon={ChartBar} weight="duotone" color={color.textBrand} />
          <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
            {t("usageInvite.title")}
          </Text>
          <Text style={[textStyle.body, { color: color.textPrimary }]}>
            {t("usageInvite.body")}
          </Text>
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
            {t("usageInvite.note")}
          </Text>
          <View style={{ gap: space.sm }}>
            {button(t("usageInvite.accept"), true)}
            {button(t("usageInvite.decline"), false)}
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
