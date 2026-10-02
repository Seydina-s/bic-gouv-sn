import { MegaphoneIcon as Megaphone } from "phosphor-react-native/src/icons/Megaphone";
import { PencilSimpleLineIcon as PencilSimpleLine } from "phosphor-react-native/src/icons/PencilSimpleLine";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { SegmentedChoice } from "../../components/SegmentedChoice";
import { MessageFlow } from "../../features/participate/MessageFlow";
import { ReportFlow } from "../../features/participate/ReportFlow";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

type Mode = "write" | "report";

/**
 * Participer (decisions of the user, 01/10 and 02/10/2026): "Écrire" or "Signaler",
 * then one question at a time (direction C). Anonymous; read by the team in the
 * console.
 */
function Participate() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const [mode, setMode] = useState<Mode>("write");
  const { color, space, textStyle, layout } = theme;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: color.background }]}
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
            style={[textStyle.display, { color: color.textPrimary }]}
          >
            {t("tabs.participate")}
          </Text>
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("participate.intro")}
          </Text>
        </View>
        <SegmentedChoice<Mode>
          title={t("participate.modeTitle")}
          selected={mode}
          onSelect={setMode}
          segments={[
            {
              value: "write",
              label: t("participate.modes.write"),
              spokenLabel: t("participate.modes.writeSpoken"),
              icon: PencilSimpleLine,
            },
            {
              value: "report",
              label: t("participate.modes.report"),
              spokenLabel: t("participate.modes.reportSpoken"),
              icon: Megaphone,
            },
          ]}
        />
        {mode === "write" ? <MessageFlow /> : <ReportFlow />}
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
