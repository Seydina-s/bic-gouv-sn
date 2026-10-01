import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { MessageBox } from "../../features/participate/MessageBox";
import { ReportForm } from "../../features/participate/ReportForm";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * Participer (decision of the user, 01/10/2026): first a box to write to the
 * government, then a public problem to report with a photo. Anonymous; read by
 * the team in the console.
 */
function Participate() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const { color, space, textStyle, radius, layout } = theme;
  const card = {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    backgroundColor: color.background,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: color.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.lg,
          paddingBottom: bottomInset + space.xxl,
          gap: space.xl,
          width: "100%",
          maxWidth: layout.readingMaxWidth,
          alignSelf: "center",
        }}
      >
        <View style={{ gap: space.sm }}>
          <Text
            accessibilityRole="header"
            style={[textStyle.headline, { color: color.textPrimary }]}
          >
            {t("tabs.participate")}
          </Text>
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("participate.intro")}
          </Text>
        </View>
        <View style={card}>
          <MessageBox />
        </View>
        <View style={card}>
          <ReportForm />
        </View>
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {t("participate.anonymous")}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Behind the "participate" kill switch: off, it says so plainly. */
export default function ParticipateScreen() {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="participate" title={t("tabs.participate")}>
      <Participate />
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
