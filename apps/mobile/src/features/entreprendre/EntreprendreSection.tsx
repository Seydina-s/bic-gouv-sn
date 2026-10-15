import { useRouter } from "expo-router";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { RocketLaunchIcon as RocketLaunch } from "phosphor-react-native/src/icons/RocketLaunch";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { GROUP_ORDER, GROUPS } from "./groups";
import { useEntreprendre } from "./useEntreprendre";

/** The four shortcuts of the card: the DER/FJ itself is in the space. */
const SHORTCUTS = GROUP_ORDER.filter((group) => group !== "der");

/**
 * The front page's door to "Entreprendre" (DER-01, owner's request of 12/10/2026):
 * a card in the flag's green, its four ways in, and the whole space one tap away.
 * Hidden until der.sn has been read once.
 */
export function EntreprendreSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useEntreprendre();
  const { color, space, textStyle, radius, touchTarget } = theme;
  if (data === undefined || data.pages.length === 0) {
    return null;
  }
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <View
        style={[
          styles.card,
          {
            borderRadius: radius.lg,
            padding: space.lg,
            gap: space.md,
            backgroundColor: color.brandSurface,
          },
        ]}
      >
        <View style={[styles.row, { gap: space.md }]}>
          <View
            style={[
              styles.badge,
              { borderRadius: radius.md, padding: space.sm, backgroundColor: color.accent },
            ]}
          >
            <Icon icon={RocketLaunch} weight="duotone" color={color.onAccent} />
          </View>
          <View style={styles.flex}>
            <Text
              accessibilityRole="header"
              style={[textStyle.title, { color: color.onBrandSurface }]}
            >
              {t("entreprendre.title")}
            </Text>
            <Text style={[textStyle.bodySmall, { color: color.accentOnBrandSurface }]}>
              {t("entreprendre.tagline")}
            </Text>
          </View>
        </View>
        <View style={[styles.grid, { gap: space.sm }]}>
          {SHORTCUTS.map((group) => (
            <Pressable
              key={group}
              accessibilityRole="link"
              onPress={() => {
                router.push({
                  pathname: "/entreprendre/[slug]",
                  params: { slug: GROUPS[group].first },
                });
              }}
              style={dimWhenPressed(
                [
                  styles.tile,
                  {
                    minHeight: touchTarget.min + space.lg,
                    gap: space.xs,
                    padding: space.md,
                    borderRadius: radius.md,
                    backgroundColor: color.surfaceRaised,
                  },
                ],
                theme.opacity.controlPressed,
              )}
            >
              <Icon icon={GROUPS[group].icon} weight="duotone" color={color.textBrand} />
              <Text style={[textStyle.label, { color: color.textPrimary }]}>
                {t(`entreprendre.groups.${group}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            router.push("/entreprendre");
          }}
          style={dimWhenPressed(
            [styles.row, styles.more, { minHeight: touchTarget.min, gap: space.xs }],
            theme.opacity.controlPressed,
          )}
        >
          <Text style={[textStyle.label, { color: color.onBrandSurface }]}>
            {t("entreprendre.discover")}
          </Text>
          <Icon icon={CaretRight} size="sm" color={color.onBrandSurface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  badge: { alignSelf: "flex-start" },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: { flexGrow: 1, flexBasis: "45%", justifyContent: "center" },
  more: { alignSelf: "flex-end" },
});
