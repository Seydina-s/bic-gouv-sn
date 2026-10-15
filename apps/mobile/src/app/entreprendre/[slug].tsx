import { entreprendreSlugSchema } from "@bgs/shared-types";
import { Stack, useLocalSearchParams } from "expo-router";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { useContentWidth } from "../../components/useTwoPane";
import { GuideRenderer } from "../../features/entreprendre/GuideRenderer";
import { GROUPS } from "../../features/entreprendre/groups";
import { useEntreprendrePage } from "../../features/entreprendre/useEntreprendre";
import { formatPublishedOn } from "../../features/news/format";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * One page of the DER/FJ's offer, in our own layout and in its own words (DER-01):
 * its guides as numbered steps, its source and the day it was read at the end.
 */
export default function EntreprendrePageScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const parsed = entreprendreSlugSchema.safeParse(params.slug);
  const slug = parsed.success ? parsed.data : "presentation";
  const { data, isPending } = useEntreprendrePage(slug);
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const width = useContentWidth();
  const { color, space, textStyle, radius, touchTarget } = theme;

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: "",
        headerBackTitle: t("entreprendre.title"),
        headerTintColor: color.textBrand,
        headerStyle: { backgroundColor: color.background },
        headerShadowVisible: false,
      }}
    />
  );
  if (!parsed.success || data === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: color.background, padding: space.xl }]}>
        {header}
        {parsed.success && isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("entreprendre.notFound")}
          </Text>
        )}
      </View>
    );
  }
  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      {header}
      <ScrollView
        contentContainerStyle={{
          width,
          alignSelf: "center",
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxxl,
        }}
      >
        <View style={[styles.row, { gap: space.sm, marginBottom: space.sm }]}>
          <Icon icon={GROUPS[data.group].icon} size="sm" weight="duotone" color={color.textBrand} />
          <Text style={[textStyle.label, { color: color.textBrand }]}>
            {t(`entreprendre.groups.${data.group}`)}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={[textStyle.leadHeadline, { color: color.textPrimary, marginBottom: space.xl }]}
        >
          {data.title}
        </Text>
        <GuideRenderer blocks={data.blocks} />
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(data.sourceUrl)}
          style={({ pressed }) => [
            styles.official,
            {
              gap: space.sm,
              minHeight: touchTarget.min,
              paddingHorizontal: space.xl,
              borderRadius: radius.md,
              backgroundColor: pressed ? color.primaryPressed : color.primary,
              marginTop: space.lg,
            },
          ]}
        >
          <Icon icon={ArrowSquareOut} size="sm" color={color.onPrimary} />
          <Text style={[textStyle.label, { color: color.onPrimary }]}>
            {t("entreprendre.official")}
          </Text>
        </Pressable>
        <Text style={[textStyle.bodySmall, { color: color.textTertiary, marginTop: space.md }]}>
          {t("entreprendre.readOn", { date: formatPublishedOn(data.fetchedAt.slice(0, 10), lang) })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  official: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
