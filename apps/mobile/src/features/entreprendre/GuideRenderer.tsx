import type { Block } from "@bgs/shared-types";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { BlockRenderer, Runs } from "../news/BlockRenderer";
import { guideParts, type Step } from "./steps";

/** A run of numbered steps: each number in its circle, joined by a thread. */
function Steps({ steps }: { steps: Step[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const disc = touchTarget.min - space.md;
  return (
    <View accessibilityRole="list" style={{ marginBottom: space.lg }}>
      {steps.map((step, index) => (
        <View
          key={`${String(step.number)}-${String(index)}`}
          style={[styles.step, { gap: space.md }]}
        >
          <View style={styles.rail}>
            <View
              style={[
                styles.disc,
                {
                  width: disc,
                  height: disc,
                  borderRadius: radius.full,
                  backgroundColor: color.primary,
                },
              ]}
            >
              <Text
                accessibilityLabel={t("entreprendre.step", { count: step.number })}
                style={[textStyle.label, { color: color.onPrimary }]}
              >
                {step.number}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.thread,
                  { backgroundColor: color.border, marginVertical: space.xxs },
                ]}
              />
            )}
          </View>
          <Text
            style={[
              textStyle.body,
              styles.words,
              { color: color.textPrimary, paddingBottom: space.lg },
            ]}
          >
            <Runs inlines={step.inlines} />
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * An official page of the Entreprendre space in our own layout (owner's choice of
 * 12/10/2026): its blocks as articles show them, and its numbered guides as steps.
 */
export function GuideRenderer({ blocks }: { blocks: Block[] }) {
  return guideParts(blocks).map((part, index) =>
    part.kind === "steps" ? (
      // Parts never reorder: the index is a stable key here.
      <Steps key={index} steps={part.steps} />
    ) : (
      <BlockRenderer key={index} blocks={[part.block]} />
    ),
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row" },
  rail: { alignItems: "center" },
  disc: { alignItems: "center", justifyContent: "center" },
  thread: { width: 2, flex: 1 },
  words: { flex: 1 },
});
