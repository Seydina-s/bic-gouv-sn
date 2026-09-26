import type { CategoryTone } from "@bgs/ui";
import { CaretLeftIcon as CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import type { ComponentType } from "react";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { pageSlots } from "./page-slots";

export interface PaginationProps {
  current: number;
  /** Null when the API did not give a total: only previous / next are offered. */
  count: number | null;
  hasNext: boolean;
  tone: CategoryTone;
  onChange: (page: number) => void;
}

/**
 * Numbered pages under a section's stories: arrows at both ends, the current page
 * filled with the section's tone, gaps for long runs (1 … 4 5 6 … 12).
 */
export function Pagination({ current, count, hasNext, tone, onChange }: PaginationProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const canGoBack = current > 1;
  const canGoOn = count === null ? hasNext : current < count;

  const arrow = (glyph: ComponentType<PhosphorProps>, label: string, page: number, on: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !on }}
      disabled={!on}
      onPress={() => {
        onChange(page);
      }}
      style={({ pressed }) => [
        styles.cell,
        {
          width: touchTarget.min,
          height: touchTarget.min,
          borderRadius: radius.full,
          opacity: on ? (pressed ? theme.opacity.cardPressed : 1) : theme.opacity.disabled,
        },
      ]}
    >
      <Icon icon={glyph} color={tone.ink} />
    </Pressable>
  );

  return (
    <View accessibilityRole="toolbar" accessibilityLabel={t("section.pagination")}>
      <View style={[styles.row, { gap: space.xxs }]}>
        {arrow(CaretLeft, t("section.previous"), current - 1, canGoBack)}
        {count !== null &&
          pageSlots(current, count).map((slot, index) =>
            slot === "gap" ? (
              <Text
                key={`gap-${String(index)}`}
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={[
                  textStyle.label,
                  { color: color.textTertiary, paddingHorizontal: space.xxs },
                ]}
              >
                …
              </Text>
            ) : (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={t("section.page", { page: slot })}
                accessibilityState={{ selected: slot === current }}
                onPress={() => {
                  onChange(slot);
                }}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    minWidth: touchTarget.min - space.sm,
                    height: touchTarget.min - space.sm,
                    borderRadius: radius.full,
                    backgroundColor: slot === current ? tone.ink : "transparent",
                    opacity: pressed ? theme.opacity.cardPressed : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyle.label,
                    styles.number,
                    { color: slot === current ? color.background : color.textPrimary },
                  ]}
                >
                  {slot}
                </Text>
              </Pressable>
            ),
          )}
        {arrow(CaretRight, t("section.next"), current + 1, canGoOn)}
      </View>
      {count !== null && (
        <Text
          style={[
            textStyle.caption,
            styles.caption,
            { color: color.textSecondary, marginTop: space.xs },
          ]}
        >
          {t("section.pageOf", { current, total: count })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  cell: { alignItems: "center", justifyContent: "center" },
  number: { fontVariant: ["tabular-nums"] },
  caption: { textAlign: "center" },
});
