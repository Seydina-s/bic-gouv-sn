import { ArrowRightIcon as ArrowRight } from "phosphor-react-native/src/icons/ArrowRight";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";
import { Pagination, type PaginationProps } from "./Pagination";

export interface PageNavigationProps extends PaginationProps {
  /** Names what comes next: "Articles suivants", "Démarches suivantes". */
  nextLabel: string;
}

/**
 * The end of a page of a list: a large button to the next page (what most readers
 * want), then the numbered pages to jump further or come back.
 */
export function PageNavigation({ nextLabel, ...pagination }: PageNavigationProps) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget, opacity } = theme;
  const { current, count, hasNext, tone, onChange } = pagination;
  const hasMore = count === null ? hasNext : current < count;
  return (
    <View
      style={[
        styles.block,
        {
          borderTopColor: color.border,
          paddingVertical: space.xl,
          paddingHorizontal: space.lg,
          gap: space.lg,
        },
      ]}
    >
      {hasMore && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onChange(current + 1);
          }}
          style={({ pressed }) => [
            styles.next,
            {
              backgroundColor: tone.ink,
              borderRadius: radius.md,
              minHeight: touchTarget.min,
              paddingHorizontal: space.xl,
              gap: space.sm,
              opacity: pressed ? opacity.cardPressed : 1,
            },
          ]}
        >
          <Text style={[textStyle.label, { color: color.background }]}>{nextLabel}</Text>
          <Icon icon={ArrowRight} size="sm" color={color.background} />
        </Pressable>
      )}
      <Pagination {...pagination} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderTopWidth: StyleSheet.hairlineWidth },
  next: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
