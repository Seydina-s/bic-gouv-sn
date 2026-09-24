import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/** Empty home placeholder: proves theme, i18n and safe areas are wired. */
export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.color.background,
          paddingTop: insets.top + theme.space.lg,
          paddingHorizontal: theme.space.lg,
        },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[theme.textStyle.headline, { color: theme.color.textBrand }]}
      >
        {t("tabs.home")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
