import { useRouter } from "expo-router";
import { BriefcaseIcon as Briefcase } from "phosphor-react-native/src/icons/Briefcase";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { OpportunityCard } from "./OpportunityCard";
import { useOpportunities } from "./useOpportunities";

/** Opportunities shown on the front page; the others are one tap away. */
const ON_FRONT_PAGE = 3;

/**
 * The front page's "Opportunités", right after the articles (decision of the
 * user, 01/10/2026): the ones closing soonest. While none is published, the section
 * stays and says what will appear there (user's request, 02/10/2026).
 */
export function OpportunitiesSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useOpportunities();
  const { color, space, textStyle } = theme;
  if (data === undefined) {
    return null;
  }
  const items = data.opportunities;
  return (
    <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
          {t("opportunities.title")}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            router.push("/opportunities");
          }}
          style={dimWhenPressed(
            [styles.seeAll, { minHeight: theme.touchTarget.min, paddingLeft: space.md }],
            theme.opacity.controlPressed,
          )}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>
            {t("opportunities.seeAll")}
          </Text>
        </Pressable>
      </View>
      {items.length === 0 ? <NoOpportunityYet /> : null}
      {items.slice(0, ON_FRONT_PAGE).map((item) => (
        <OpportunityCard
          key={item.id}
          item={item}
          onPress={(id) => {
            router.push({ pathname: "/opportunity/[id]", params: { id } });
          }}
        />
      ))}
    </View>
  );
}

/** Said instead of an empty space: nothing open yet, and what will appear here. */
function NoOpportunityYet() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius } = theme;
  return (
    <View
      style={[
        styles.empty,
        {
          gap: space.md,
          padding: space.lg,
          borderRadius: radius.lg,
          borderColor: color.border,
          backgroundColor: color.surface,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { borderRadius: radius.md, backgroundColor: color.primaryContainer, padding: space.sm },
        ]}
      >
        <Icon icon={Briefcase} weight="duotone" color={color.onPrimaryContainer} />
      </View>
      <View style={[styles.emptyText, { gap: space.xxs }]}>
        <Text style={[textStyle.label, { color: color.textPrimary }]}>
          {t("opportunities.empty")}
        </Text>
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
          {t("opportunities.emptyHint")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
  emptyIcon: { alignSelf: "flex-start" },
  emptyText: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { justifyContent: "center" },
});
