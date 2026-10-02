import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { ArrowLeftIcon as ArrowLeft } from "phosphor-react-native/src/icons/ArrowLeft";
import type { ComponentType, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { FRENCH_VOICE, ReadAloudButton } from "../news/ListenButton";

/*
 * Participer, one question at a time (direction C chosen by the owner, 02/10/2026):
 * a progress bar, the question in large type with "Écouter", large tiles to choose,
 * then "Retour" and "Continuer". References: FixMyStreet and SeeClickFix for citizen
 * reports, Duolingo for one question per screen.
 */

/** Progress, the question, and "Écouter", which reads the question then the choices. */
export function StepHeader({
  step,
  count,
  question,
  choices = [],
}: {
  step: number;
  count: number;
  question: string;
  choices?: readonly string[];
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius } = theme;
  return (
    <View style={{ gap: space.sm }}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("participate.step", { step, count })}
        accessibilityValue={{ min: 0, max: count, now: step }}
        style={[styles.progress, { gap: space.xs }]}
      >
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressPart,
              {
                height: space.xs,
                borderRadius: radius.full,
                backgroundColor: index < step ? color.primary : color.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[textStyle.caption, { color: color.textTertiary }]}>
        {t("participate.step", { step, count })}
      </Text>
      <Text accessibilityRole="header" style={[textStyle.headline, { color: color.textPrimary }]}>
        {question}
      </Text>
      <View style={styles.listen}>
        <ReadAloudButton language={FRENCH_VOICE} pieces={() => [question, ...choices]} />
      </View>
    </View>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint: string;
  icon: ComponentType<PhosphorProps>;
}

/** Large tiles, two per row (an odd last one takes the whole row). Radio semantics. */
export function ChoiceTiles<T extends string>({
  title,
  choices,
  selected,
  onSelect,
}: {
  title: string;
  choices: readonly Choice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
      style={[styles.tiles, { gap: space.sm }]}
    >
      {choices.map((choice, index) => {
        const checked = choice.value === selected;
        const alone = index === choices.length - 1 && choices.length % 2 === 1;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            aria-checked={checked}
            accessibilityLabel={`${choice.label}, ${choice.hint}`}
            onPress={() => {
              onSelect(choice.value);
            }}
            style={({ pressed }) => [
              alone ? styles.tileWhole : styles.tileHalf,
              {
                gap: space.sm,
                padding: space.lg,
                minHeight: touchTarget.min * 2,
                borderRadius: radius.lg,
                borderWidth: checked ? theme.borderWidth.selected : StyleSheet.hairlineWidth,
                borderColor: checked ? color.primary : color.border,
                backgroundColor: checked
                  ? color.primaryContainer
                  : pressed
                    ? color.surface
                    : color.background,
              },
            ]}
          >
            <Icon
              icon={choice.icon}
              size="lg"
              weight={checked ? "fill" : "duotone"}
              color={checked ? color.onPrimaryContainer : color.textBrand}
            />
            <View style={{ gap: space.xxs }}>
              <Text
                style={[
                  textStyle.subtitle,
                  { color: checked ? color.onPrimaryContainer : color.textPrimary },
                ]}
              >
                {choice.label}
              </Text>
              <Text
                style={[
                  textStyle.bodySmall,
                  { color: checked ? color.onPrimaryContainer : color.textTertiary },
                ]}
              >
                {choice.hint}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Retour" (except on the first step), then the step's own action. */
export function StepFooter({
  onBack,
  children,
}: {
  onBack: (() => void) | null;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  return (
    <View style={{ gap: space.sm }}>
      {children}
      {onBack !== null && (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={dimWhenPressed(
            [styles.back, { gap: space.xs, minHeight: theme.touchTarget.min }],
            theme.opacity.controlPressed,
          )}
        >
          <Icon icon={ArrowLeft} size="sm" color={color.textBrand} />
          <Text style={[textStyle.label, { color: color.textBrand }]}>{t("participate.back")}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The primary action of a step ("Continuer"). */
export function NextButton({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { color, textStyle, radius, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.next,
        {
          minHeight: touchTarget.min,
          borderRadius: radius.md,
          backgroundColor: pressed ? color.primaryPressed : color.primary,
          opacity: enabled ? 1 : theme.opacity.disabled,
        },
      ]}
    >
      <Text style={[textStyle.label, { color: color.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

/** Each step fades in as it comes (Reanimated skips it under reduced motion). */
export function StepBody({ step, children }: { step: number; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <Animated.View
      key={step}
      entering={FadeIn.duration(theme.motion.duration.normal)}
      style={{ gap: theme.space.lg }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row" },
  progressPart: { flex: 1 },
  listen: { alignSelf: "flex-start" },
  tiles: { flexDirection: "row", flexWrap: "wrap" },
  tileHalf: { flexBasis: "47%", flexGrow: 1 },
  tileWhole: { flexBasis: "100%" },
  back: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  next: { alignItems: "center", justifyContent: "center" },
});
