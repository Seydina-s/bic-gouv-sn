import { StyleSheet, Text, View } from "react-native";
import { Baobab } from "../../components/Baobab";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatDay } from "./format";

/** "La pièce du jour": today's date woven large, what was published today, one baobab. */
export function FeedHeader({ todayCount, today }: { todayCount: number; today: Date }) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const { weekday, date } = formatDay(today, lang);
  const { color, space, textStyle } = theme;

  return (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.lg }}>
      <View style={[styles.watermark, { right: space.sm }]}>
        <Baobab size={132} color={color.textBrand} opacity={0.06} />
      </View>
      <Text accessibilityRole="header" style={[textStyle.display, { color: color.textPrimary }]}>
        {weekday}
        {"\n"}
        <Text style={{ color: color.textBrand }}>{date}</Text>
      </Text>
      <Text style={[textStyle.label, { color: color.textSecondary, marginTop: space.sm }]}>
        {todayCount > 0 ? t("feed.newsToday", { count: todayCount }) : t("feed.latest")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: { position: "absolute", top: 0 },
});
