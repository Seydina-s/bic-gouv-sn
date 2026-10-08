import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { Baobab } from "./Baobab";

/**
 * A screen that honestly says why there is nothing here (switched
 * off for the moment, update needed): the baobab and two short lines, no filler.
 */
export function NoticeScreen({
  title,
  heading,
  body,
}: {
  title: string;
  heading: string;
  body: string;
}) {
  const { theme } = useTheme();
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
          {heading}
        </Text>
        <Text
          style={[
            textStyle.body,
            styles.centerText,
            { color: color.textSecondary, marginTop: space.xs },
          ]}
        >
          {body}
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
