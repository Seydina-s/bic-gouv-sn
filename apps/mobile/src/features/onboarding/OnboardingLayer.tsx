import { useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { Onboarding } from "./Onboarding";

/**
 * The welcome screens above the app (the navigator stays mounted underneath).
 * When they end, they fade away to reveal the app, never a sudden cut (user
 * request, 30/09/2026); a cut only when the phone asks for less motion.
 */
export function OnboardingLayer({ onFinish }: { onFinish: () => void }) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    if (leaving) {
      return;
    }
    setLeaving(true);
    if (reduceMotion !== false) {
      onFinish();
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: theme.motion.duration.slow,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  };

  return (
    <Animated.View
      accessibilityViewIsModal={!leaving}
      // While it fades, the app underneath already answers touches.
      pointerEvents={leaving ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      <Onboarding onFinish={finish} />
    </Animated.View>
  );
}
