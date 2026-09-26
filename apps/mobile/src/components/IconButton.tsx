import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";

export interface IconButtonProps {
  icon: ComponentType<PhosphorProps>;
  /** Spoken name of the action: required, the icon has no visible label. */
  label: string;
  onPress: () => void;
  weight?: PhosphorProps["weight"];
  selected?: boolean;
}

/** An icon action with a 48 dp touch target and a spoken label. */
export function IconButton({ icon, label, onPress, weight, selected }: IconButtonProps) {
  const { theme } = useTheme();
  const { touchTarget, color } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(selected === undefined ? {} : { accessibilityState: { selected } })}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          minWidth: touchTarget.min,
          minHeight: touchTarget.min,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      <Icon icon={icon} color={color.textBrand} {...(weight === undefined ? {} : { weight })} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center" },
});
