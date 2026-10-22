import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
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
 *
 * Closed with its button, the detail glides away to the right like a curtain while the
 * page widens with it, on one eased movement, and goes only once out of sight (owner's
 * report of 22/10/2026: it paused about a second, then vanished at once).
 */
export function ListDetail({ list, detail, onClose, closeLabel }: ListDetailProps) {
  const { theme } = useTheme();
  const { twoPane, listPaneWidth } = useTwoPane();
  const { color, motion, touchTarget, opacity, radius } = theme;
  const open = twoPane && detail !== null;
  const glide = LinearTransition.duration(motion.duration.normal).reduceMotion(ReduceMotion.System);
  const { width } = useWindowDimensions();
  // 0 open, 1 closed: the curtain's way, run by the close button.
  const curtain = useSharedValue(0);
  const [closing, setClosing] = useState(false);
  // Closed, from whatever side: the next detail opens without a curtain drawn.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setClosing(false);
    }
  }
  useEffect(() => {
    if (open) {
      curtain.set(0);
    }
  }, [open, curtain]);
  const close = useCallback(() => {
    if (closing) {
      return;
    }
    setClosing(true);
    curtain.set(
      withTiming(
        1,
        {
          duration: motion.duration.slow,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished === true) {
            scheduleOnRN(onClose);
          }
        },
      ),
    );
  }, [closing, curtain, motion.duration.slow, onClose]);
  const detailWidth = width - listPaneWidth;
  const widening = useAnimatedStyle(() =>
    curtain.value === 0 ? {} : { width: listPaneWidth + curtain.value * detailWidth },
  );
  const sliding = useAnimatedStyle(() => ({
    transform: [{ translateX: curtain.value * detailWidth }],
  }));
  return (
    <View style={[styles.row, { backgroundColor: color.background }]}>
      <Animated.View
        {...(closing ? {} : { layout: glide })}
        style={
          open
            ? [styles.listPane, { width: listPaneWidth, borderRightColor: color.border }, widening]
            : styles.full
        }
      >
        {list}
      </Animated.View>
      {open && (
        <Animated.View
          entering={SlideInRight.duration(motion.duration.normal).reduceMotion(ReduceMotion.System)}
          {...(closing
            ? {}
            : {
                exiting: SlideOutRight.duration(motion.duration.exitNormal).reduceMotion(
                  ReduceMotion.System,
                ),
              })}
          style={[styles.detail, sliding]}
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
            onPress={close}
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
