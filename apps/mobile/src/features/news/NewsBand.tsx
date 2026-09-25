import type { NewsSummary } from "@bgs/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey } from "./category";
import { formatPublishedOn } from "./format";
import { Selvage, SELVAGE_WIDTH } from "./Selvage";

export interface NewsBandProps {
  item: NewsSummary;
  /** The newest band is woven wider: excerpt shown, larger title. */
  lead: boolean;
  lastOpened: boolean;
  onPress: (id: string) => void;
}

/** One woven band of "la pièce du jour": section selvage, section, title, day. */
export function NewsBand({ item, lead, lastOpened, onPress }: NewsBandProps) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const section = t(categoryLabelKey(item.category));
  const day = formatPublishedOn(item.publishedOn, lang);
  const { color, space, textStyle } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[section, item.title, day].filter(Boolean).join(". ")}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => [
        styles.band,
        {
          borderTopColor: color.border,
          backgroundColor: pressed ? color.surface : color.background,
          paddingVertical: lead ? space.xl : space.lg,
          paddingRight: space.lg,
          minHeight: theme.touchTarget.min,
        },
      ]}
    >
      <Selvage category={item.category} color={color.primary} />
      <View style={[styles.body, { marginLeft: space.lg - SELVAGE_WIDTH + space.sm }]}>
        <View style={styles.meta}>
          <Text style={[textStyle.caption, styles.caps, { color: color.textBrand }]}>
            {section}
          </Text>
          {lastOpened && (
            <Text
              style={[
                textStyle.caption,
                styles.knot,
                {
                  color: color.onAccentContainer,
                  backgroundColor: color.accentContainer,
                  paddingHorizontal: space.sm,
                },
              ]}
            >
              {t("feed.lastOpened")}
            </Text>
          )}
        </View>
        <Text
          style={[
            lead ? textStyle.headline : textStyle.subtitle,
            { color: color.textPrimary, marginTop: space.xs },
          ]}
          numberOfLines={lead ? 4 : 3}
        >
          {item.title}
        </Text>
        {lead && item.excerpt !== "" && (
          <Text
            style={[textStyle.body, { color: color.textSecondary, marginTop: space.sm }]}
            numberOfLines={3}
          >
            {item.excerpt}
          </Text>
        )}
        {day !== "" && (
          <Text style={[textStyle.bodySmall, { color: color.textTertiary, marginTop: space.sm }]}>
            {day}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  body: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  caps: { textTransform: "uppercase", letterSpacing: 0.6 },
  knot: { borderRadius: 999, overflow: "hidden" },
});
