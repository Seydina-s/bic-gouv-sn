import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Baobab } from "../../components/Baobab";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatDay } from "./format";

const FLAG_STRIPE_HEIGHT = 4;

/** The flag as a thin tricolour stripe: decoration only, identical in both themes. */
function FlagStripe() {
  const { theme } = useTheme();
  const { flagGreen, flagYellow, flagRed } = theme.color;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.stripe, { height: FLAG_STRIPE_HEIGHT }]}
    >
      {[flagGreen, flagYellow, flagRed].map((color) => (
        <View key={color} style={[styles.band, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/**
 * Front-page masthead ("La Une", D-05): flag stripe, the app's name, today's date,
 * a newspaper rule beneath, and the baobab once, as a faint watermark.
 */
export function Masthead({ today }: { today: Date }) {
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
          {
            paddingHorizontal: space.lg,
            paddingTop: space.lg,
            paddingBottom: space.md,
            borderBottomColor: color.textPrimary,
          },
        ]}
      >
        <View style={[styles.watermark, { right: space.md }]}>
          <Baobab size={72} color={color.textBrand} opacity={0.06} />
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  stripe: { flexDirection: "row" },
  band: { flex: 1 },
  rule: { borderBottomWidth: 1 },
  watermark: { position: "absolute", bottom: 0 },
});
