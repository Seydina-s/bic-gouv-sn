import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { OpportunityCard } from "./OpportunityCard";
import { useOpportunities } from "./useOpportunities";

/** Opportunities shown on the front page; the others are one tap away. */
const ON_FRONT_PAGE = 3;

/**
 * The front page's "Opportunités", right after the articles (decision of the
 * user, 01/10/2026): the ones closing soonest. Nothing at all while there is none.
 */
export function OpportunitiesSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useOpportunities();
  const { color, space, textStyle } = theme;
  const items = data?.opportunities ?? [];
  if (items.length === 0) {
    return null;
  }
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

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { justifyContent: "center" },
});
