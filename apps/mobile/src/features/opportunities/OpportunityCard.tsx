import type { PublicOpportunity } from "@bgs/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatDay } from "../news/format";
import { closingOf } from "./closing";

/** "Plus que 3 jours", "Dernier jour", "Jusqu'au 12 octobre", "Sans date limite". */
export function useClosingLabel(): (deadline: string | null) => { text: string; soon: boolean } {
  const { t, lang } = useTranslation();
  return (deadline) => {
    const now = new Date();
    const closing = closingOf(deadline, now);
    switch (closing.kind) {
      case "none":
        return { text: t("opportunities.noDeadline"), soon: false };
      case "today":
        return { text: t("opportunities.lastDay"), soon: true };
      case "soon":
        return { text: t("opportunities.daysLeft", { count: closing.days }), soon: true };
      case "on":
        return {
          text: t("opportunities.closesOn", {
            // The year only when it is not this one: "31 décembre 2027".
            date:
              closing.date.getFullYear() === now.getFullYear()
                ? formatDay(closing.date, lang).date
                : `${formatDay(closing.date, lang).date} ${String(closing.date.getFullYear())}`,
          }),
          soon: false,
        };
    }
  };
}

/** One opportunity: its kind, title, organisation and closing date. */
export function OpportunityCard({
  item,
  onPress,
}: {
  item: PublicOpportunity;
  onPress: (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const closing = useClosingLabel()(item.deadline);
  const { color, space, textStyle, radius } = theme;
  const kind = t(`opportunities.kinds.${item.kind}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kind}, ${item.title}, ${item.organization}, ${closing.text}`}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          gap: space.xs,
          padding: space.lg,
          borderRadius: radius.lg,
          borderColor: color.border,
          backgroundColor: pressed ? color.surface : color.background,
          minHeight: theme.touchTarget.min,
        },
      ]}
    >
      <View
        style={[
          styles.kind,
          {
            paddingHorizontal: space.sm,
            paddingVertical: space.xxs,
            borderRadius: radius.sm,
            backgroundColor: color.primaryContainer,
          },
        ]}
      >
        <Text style={[textStyle.caption, { color: color.onPrimaryContainer }]}>{kind}</Text>
      </View>
      <Text style={[textStyle.storyTitle, { color: color.textPrimary }]} numberOfLines={3}>
        {item.title}
      </Text>
      <Text style={[textStyle.bodySmall, { color: color.textSecondary }]} numberOfLines={1}>
        {item.organization}
      </Text>
      <Text
        style={[textStyle.label, { color: closing.soon ? color.textBrand : color.textTertiary }]}
      >
        {closing.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  kind: { alignSelf: "flex-start" },
});
