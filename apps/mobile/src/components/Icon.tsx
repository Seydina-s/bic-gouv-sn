import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { View } from "react-native";
import { useTheme } from "../theme/useTheme";

type IconSize = "sm" | "md" | "lg";

export interface IconProps {
  /** One icon imported alone from phosphor-react-native/src/icons (keeps the bundle small). */
  icon: ComponentType<PhosphorProps>;
  size?: IconSize;
  color?: string;
  weight?: PhosphorProps["weight"];
  /** Required unless the icon only decorates a visible label. */
  label?: string;
}

/** The only way screens draw icons (CLAUDE.md §4.3): one family, sizes from tokens. */
export function Icon({ icon: Glyph, size = "md", color, weight = "regular", label }: IconProps) {
  const { theme } = useTheme();
  return (
    <View
      accessible={label !== undefined}
      accessibilityLabel={label}
      importantForAccessibility={label === undefined ? "no-hide-descendants" : "yes"}
    >
      <Glyph size={theme.iconSize[size]} color={color ?? theme.color.textPrimary} weight={weight} />
    </View>
  );
}
