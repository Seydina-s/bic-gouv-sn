import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";

/**
 * A row leading elsewhere, under a thin rule: a page outside the app (outgoing
 * arrow) or another screen of the app (chevron).
 */
export function LinkRow({
  label,
  role,
  onPress,
}: {
  label: string;
  role: "link" | "button";
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole={role}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.md,
          minHeight: touchTarget.min,
          paddingVertical: space.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: color.border,
          backgroundColor: pressed ? color.surface : undefined,
        },
      ]}
    >
      <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>{label}</Text>
      <Icon
        icon={role === "link" ? ArrowSquareOut : CaretRight}
        size="sm"
        color={color.textBrand}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
