import type { ProcedureSummary } from "@bgs/shared-types";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { selectedEdge } from "../../components/selection";
import { useTheme } from "../../theme/useTheme";
import { FactChips, useProcedureFacts } from "./ProcedureFacts";

/**
 * One procedure in the list: title, what it is for, the facts known at the source.
 * Beside the detail pane of a large screen, the one shown there is marked selected.
 */
export function ProcedureRow({
  item,
  onPress,
  selected = false,
}: {
  item: ProcedureSummary;
  onPress: (slug: string) => void;
  selected?: boolean;
}) {
  const { theme } = useTheme();
  const facts = useProcedureFacts(item);
  const { color, space, textStyle } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[item.title, item.summary, ...facts.map((f) => `${f.label} : ${f.value}`)]
        .filter(Boolean)
        .join(". ")}
      onPress={() => {
        onPress(item.slug);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed || selected ? color.surface : color.background,
          borderBottomColor: color.border,
          ...selectedEdge(selected, color.primary, space.lg),
          paddingVertical: space.md,
          gap: space.md,
          minHeight: theme.touchTarget.min,
        },
      ]}
    >
      <View style={[styles.text, { gap: space.xs }]}>
        <Text style={[textStyle.storyTitle, { color: color.textPrimary }]} numberOfLines={3}>
          {item.title}
        </Text>
        {item.summary !== null && (
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]} numberOfLines={2}>
            {item.summary}
          </Text>
        )}
        <FactChips facts={facts} />
      </View>
      <Icon icon={CaretRight} size="sm" color={color.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});
