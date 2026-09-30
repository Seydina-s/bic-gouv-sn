import { tracking } from "@bgs/ui";
import { Pressable, StyleSheet, Text, type LayoutChangeEvent } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { CategoryIcon } from "./CategoryIcon";

export interface SectionChipProps {
  /** Section slug, or null for "every section". */
  category: string | null;
  label: string;
  active: boolean;
  onPress: () => void;
  /** "button" for a single choice (front page), "checkbox" for several (settings). */
  role?: "button" | "checkbox";
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * One section as a chip, with the icon and tone of its section: the chips and the
 * stories speak the same visual language.
 */
export function SectionChip({
  category,
  label,
  active,
  onPress,
  role = "button",
  onLayout,
}: SectionChipProps) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const tone = category === null ? null : theme.categoryTones[category];
  const ink = tone?.ink ?? (active ? color.onPrimaryContainer : color.textSecondary);
  const fill = tone?.container ?? color.primaryContainer;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "checkbox" ? { checked: active } : { selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      {...(onLayout === undefined ? {} : { onLayout })}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: touchTarget.min,
          gap: space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.full,
          borderColor: active ? (tone?.solid ?? fill) : color.border,
          backgroundColor: active ? fill : color.background,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      {category !== null && <CategoryIcon category={category} color={ink} />}
      <Text style={[textStyle.caption, styles.caps, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  caps: { textTransform: "uppercase", letterSpacing: tracking.caps },
});
