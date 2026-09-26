import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";

export interface Segment<T extends string> {
  value: T;
  /** Short visible label under the icon. */
  label: string;
  /** Full wording read by screen readers when the short label is not enough. */
  spokenLabel?: string;
  /** An icon, or a short mark (e.g. "FR") drawn in its place. */
  icon: ComponentType<PhosphorProps> | string;
}

export interface SegmentedChoiceProps<T extends string> {
  title: string;
  segments: readonly Segment<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

/**
 * Exclusive choices side by side, shaped like the tab bar: icon above its label,
 * the chosen one on the soft green pill with a filled icon. Radio semantics.
 */
export function SegmentedChoice<T extends string>({
  title,
  segments,
  selected,
  onSelect,
}: SegmentedChoiceProps<T>) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget, iconSize } = theme;

  return (
    <View style={{ gap: space.sm }}>
      <Text accessibilityRole="header" style={[textStyle.label, { color: color.textSecondary }]}>
        {title}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
        style={[
          styles.row,
          {
            borderRadius: radius.full,
            borderColor: color.glassBorder,
            backgroundColor: color.surface,
            padding: space.xs,
            gap: space.xs,
          },
        ]}
      >
        {segments.map((segment) => {
          const checked = segment.value === selected;
          const ink = checked ? color.onPrimaryContainer : color.textSecondary;
          return (
            <Pressable
              key={segment.value}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={segment.spokenLabel ?? segment.label}
              onPress={() => {
                onSelect(segment.value);
              }}
              style={({ pressed }) => [
                styles.segment,
                {
                  minHeight: touchTarget.min + space.md,
                  borderRadius: radius.full,
                  gap: space.xxs,
                  backgroundColor: checked ? color.primaryContainer : "transparent",
                  opacity: pressed ? theme.opacity.cardPressed : 1,
                },
              ]}
            >
              {typeof segment.icon === "string" ? (
                <Text
                  style={[
                    textStyle.label,
                    styles.mark,
                    { color: ink, height: iconSize.md, lineHeight: iconSize.md },
                  ]}
                >
                  {segment.icon}
                </Text>
              ) : (
                <Icon icon={segment.icon} color={ink} weight={checked ? "fill" : "regular"} />
              )}
              <Text
                numberOfLines={1}
                style={[textStyle.caption, { color: checked ? color.textPrimary : ink }]}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { letterSpacing: 0.5 },
});
