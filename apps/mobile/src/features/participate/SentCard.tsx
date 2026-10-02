import { CheckCircleIcon as CheckCircle } from "phosphor-react-native/src/icons/CheckCircle";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTheme } from "../../theme/useTheme";
import { StepBody } from "./GuidedSteps";

/** What was sent has gone: said plainly, with the way to send another. */
export function SentCard({
  message,
  again,
  onAgain,
}: {
  message: string;
  again: string;
  onAgain: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius } = theme;
  return (
    <StepBody step={0}>
      <View
        style={[
          styles.card,
          {
            gap: space.md,
            padding: space.xl,
            borderRadius: radius.lg,
            backgroundColor: color.primaryContainer,
          },
        ]}
      >
        <Icon icon={CheckCircle} size="lg" weight="fill" color={color.onPrimaryContainer} />
        <Text
          accessibilityRole="alert"
          style={[textStyle.subtitle, styles.center, { color: color.onPrimaryContainer }]}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAgain}
          style={dimWhenPressed(
            [styles.again, { minHeight: theme.touchTarget.min }],
            theme.opacity.controlPressed,
          )}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>{again}</Text>
        </Pressable>
      </View>
    </StepBody>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center" },
  center: { textAlign: "center" },
  again: { justifyContent: "center" },
});
