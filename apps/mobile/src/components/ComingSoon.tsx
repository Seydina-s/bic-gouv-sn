import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";
import { Baobab } from "./Baobab";

/** Honest empty state for sections not built yet: no placeholder content. */
export function ComingSoon({ title }: { title: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle } = theme;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: color.background,
          paddingTop: insets.top + space.xl,
          paddingHorizontal: space.lg,
        },
      ]}
    >
      <Text accessibilityRole="header" style={[textStyle.headline, { color: color.textPrimary }]}>
        {title}
      </Text>
      <View style={styles.center}>
        <Baobab size={120} color={color.textBrand} opacity={0.35} />
        <Text style={[textStyle.subtitle, { color: color.textPrimary, marginTop: space.lg }]}>
          {t("comingSoon.title")}
        </Text>
        <Text
          style={[
            textStyle.body,
            styles.centerText,
            { color: color.textSecondary, marginTop: space.xs },
          ]}
        >
          {t("comingSoon.body")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  centerText: { textAlign: "center" },
});

type TabKey = "tabs.nearMe" | "tabs.assistant" | "tabs.procedures" | "tabs.participate";

/** Route component for a section that is not built yet. */
export function comingSoonScreen(titleKey: TabKey) {
  return function ComingSoonScreen() {
    const { t } = useTranslation();
    return <ComingSoon title={t(titleKey)} />;
  };
}
