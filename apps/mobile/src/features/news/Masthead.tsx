import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Baobab } from "../../components/Baobab";
import { FlagStripe } from "../../components/FlagStripe";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatDay } from "./format";

/**
 * Front-page masthead ("La Une", D-05): flag stripe, the app's name, today's date,
 * a newspaper rule beneath, and the baobab once, as a faint watermark. Screen-level
 * actions (favorites, search) sit on the right of the name.
 */
export function Masthead({ today, actions }: { today: Date; actions?: ReactNode }) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { weekday, date } = formatDay(today, lang);
  const { color, space, textStyle } = theme;

  return (
    <View style={{ paddingTop: insets.top }}>
      <FlagStripe />
      <View
        style={[
          styles.rule,
          styles.row,
          {
            paddingHorizontal: space.lg,
            paddingTop: space.lg,
            paddingBottom: space.md,
            borderBottomColor: color.textPrimary,
          },
        ]}
      >
        <View style={[styles.watermark, { right: space.md }]}>
          <Baobab size={72} color={color.textBrand} opacity={theme.opacity.watermark} />
        </View>
        <View style={styles.titles}>
          <Text
            accessibilityRole="header"
            style={[
              textStyle.title,
              { fontFamily: textStyle.display.fontFamily, color: color.textBrand },
            ]}
          >
            {t("app.name")}
          </Text>
          <Text style={[textStyle.label, { color: color.textSecondary }]}>
            {weekday} {date}
          </Text>
        </View>
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { borderBottomWidth: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  titles: { flex: 1 },
  watermark: { position: "absolute", bottom: 0 },
});
