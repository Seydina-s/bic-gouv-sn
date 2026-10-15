import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";
import { useTwoPane } from "./useTwoPane";

export interface ListDetailProps {
  /** The page (a front page, a list), kept mounted in every layout. */
  list: ReactNode;
  /** What was chosen, shown beside the page on a wide screen; null: nothing chosen. */
  detail: ReactNode | null;
  onClose: () => void;
  /** Said by the button that closes the detail ("Fermer l'article"). */
  closeLabel: string;
}

/**
 * A page and what was chosen in it, on a wide screen (a phone on its side, a tablet,
 * an unfolded foldable): the page alone, at full width, until something is chosen;
 * then its detail slides in from the right and the page narrows beside it; a round
 * button on their edge closes it, the detail sliding out and the page widening again
 * (owner's request, 14/10/2026). On a narrow screen, only the page: a choice opens its
 * own screen. The page's tree never changes, so a search being typed keeps its keyboard.
 */
export function ListDetail({ list, detail, onClose, closeLabel }: ListDetailProps) {
  const { theme } = useTheme();
  const { twoPane, listPaneWidth } = useTwoPane();
  const { color, motion, touchTarget, opacity, radius } = theme;
  const open = twoPane && detail !== null;
  const glide = LinearTransition.duration(motion.duration.normal).reduceMotion(ReduceMotion.System);
  return (
    <View style={[styles.row, { backgroundColor: color.background }]}>
      <Animated.View
        layout={glide}
        style={
          open
            ? [styles.listPane, { width: listPaneWidth, borderRightColor: color.border }]
            : styles.full
        }
      >
        {list}
      </Animated.View>
      {open && (
        <Animated.View
          entering={SlideInRight.duration(motion.duration.normal).reduceMotion(ReduceMotion.System)}
          exiting={SlideOutRight.duration(motion.duration.exitNormal).reduceMotion(
            ReduceMotion.System,
          )}
          style={styles.detail}
          testID="list-detail-pane"
        >
          {detail}
        </Animated.View>
      )}
      {open && (
        <Animated.View
          entering={FadeIn.duration(motion.duration.normal).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(motion.duration.exitFast).reduceMotion(ReduceMotion.System)}
          pointerEvents="box-none"
          style={[
            styles.closeAnchor,
            { left: listPaneWidth - touchTarget.min / 2, width: touchTarget.min },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={({ pressed }) => [
              styles.close,
              {
                width: touchTarget.min,
                height: touchTarget.min,
                borderRadius: radius.full,
                backgroundColor: color.surfaceRaised,
                borderColor: color.glassBorder,
                shadowColor: color.scrim,
                opacity: pressed ? opacity.cardPressed : 1,
              },
            ]}
          >
            <Icon icon={CaretRight} color={color.textBrand} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row" },
  full: { flex: 1, alignItems: "center" },
  listPane: { borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
  closeAnchor: { position: "absolute", top: 0, bottom: 0, justifyContent: "center" },
  close: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
