import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { Stack, useLocalSearchParams } from "expo-router";
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
import { useClosingLabel } from "../../features/opportunities/OpportunityCard";
import { ShareOpportunity } from "../../features/opportunities/ShareOpportunity";
import { useOpportunity } from "../../features/opportunities/useOpportunities";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** The host shown as the source, without "www.". */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * One opportunity: what the official page says, and the way to it. The app never
 * takes the application itself: it leads to the official page (CLAUDE.md §1).
 */
export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { opportunity, isPending } = useOpportunity(id);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const closingLabel = useClosingLabel();
  const { color, space, textStyle, radius, layout, touchTarget } = theme;

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: "",
        headerBackTitle: t("article.back"),
        headerTintColor: color.textBrand,
        headerStyle: { backgroundColor: color.background },
        headerShadowVisible: false,
        headerRight: () =>
          opportunity === undefined ? null : <ShareOpportunity opportunity={opportunity} />,
      }}
    />
  );
  if (opportunity === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: color.background, padding: space.xl }]}>
        {header}
        {isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("opportunities.notFound")}
          </Text>
        )}
      </View>
    );
  }
  const closing = closingLabel(opportunity.deadline);
  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      {header}
      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.md,
          width: "100%",
          maxWidth: layout.readingMaxWidth,
          alignSelf: "center",
        }}
      >
        <Text style={[textStyle.label, { color: color.textBrand }]}>
          {t(`opportunities.kinds.${opportunity.kind}`)}
        </Text>
        <Text accessibilityRole="header" style={[textStyle.headline, { color: color.textPrimary }]}>
          {opportunity.title}
        </Text>
        <Text style={[textStyle.subtitle, { color: color.textSecondary }]}>
          {opportunity.organization}
        </Text>
        <Text
          style={[textStyle.label, { color: closing.soon ? color.textBrand : color.textTertiary }]}
        >
          {closing.text}
        </Text>
        <Text style={[textStyle.body, { color: color.textPrimary }]}>{opportunity.summary}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityHint={t("opportunities.officialHint")}
          onPress={() => void Linking.openURL(opportunity.officialUrl)}
          style={({ pressed }) => [
            styles.official,
            {
              gap: space.sm,
              minHeight: touchTarget.min,
              paddingHorizontal: space.xl,
              borderRadius: radius.md,
              backgroundColor: pressed ? color.primaryPressed : color.primary,
              marginTop: space.md,
            },
          ]}
        >
          <Icon icon={ArrowSquareOut} size="sm" color={color.onPrimary} />
          <Text style={[textStyle.label, { color: color.onPrimary }]}>
            {t("opportunities.official")}
          </Text>
        </Pressable>
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {t("opportunities.source", { host: hostOf(opportunity.officialUrl) })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  official: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
