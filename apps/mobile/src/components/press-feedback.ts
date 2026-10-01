import type { PressableStateCallbackType, StyleProp, ViewStyle } from "react-native";

/**
 * The style of a plain control (text link, text button) that dims the instant the
 * finger lands: the tap is felt before anything else happens.
 */
export function dimWhenPressed(style: StyleProp<ViewStyle>, opacity: number) {
  return ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    style,
    pressed && { opacity },
  ];
}
