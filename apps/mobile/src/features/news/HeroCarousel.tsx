import type { NewsSummary } from "@bgs/shared-types";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion, useScreenReader } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { LeadStory } from "./Stories";

export interface HeroCarouselProps {
  stories: NewsSummary[];
  /** Width of one slide (the column the front page sits in). */
  width: number;
  lastOpened: string | null;
  onPress: (id: string) => void;
}

/** After the reader swiped, the story chosen stays this many times longer. */
export const DWELL_AFTER_SWIPE = 2;

/** How long a story stays before the next one: longer for the one the reader chose. */
export function dwellOf(base: number, chosenByReader: boolean): number {
  return chosenByReader ? base * DWELL_AFTER_SWIPE : base;
}

/**
 * "À la une": the newest pictured stories take turns every few seconds, sliding
 * sideways. Swipeable at any time. Turning waits while a finger is on it and off
 * screen; after a swipe it goes on from the story chosen, which stays twice as long
 * (owner's request of 22/10/2026: a swipe used to stop it for good). It does not turn
 * with "reduce motion" or a screen reader: the stories then stay reachable by swiping.
 */
export function HeroCarousel({ stories, width, lastOpened, onPress }: HeroCarouselProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const list = useRef<FlatList<NewsSummary>>(null);
  const [index, setIndex] = useState(0);
  /** The story shown was chosen by the reader's swipe: it stays longer. */
  const [chosen, setChosen] = useState(false);
  const [touching, setTouching] = useState(false);
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReader();
  const focused = useIsFocused();
  const { color, space, radius } = theme;
  const count = stories.length;
  const canTurn = count > 1 && reduceMotion === false && screenReader === false;
  const turning = canTurn && !touching && focused;

  useEffect(() => {
    if (!turning) {
      return;
    }
    const timer = setTimeout(
      () => {
        const next = (index + 1) % count;
        list.current?.scrollToOffset({ offset: next * width, animated: true });
        setIndex(next);
        setChosen(false);
      },
      dwellOf(theme.motion.duration.carouselDwell, chosen),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [turning, index, count, width, chosen, theme.motion.duration.carouselDwell]);

  return (
    <View accessibilityLabel={t("section.carousel")}>
      <FlatList
        ref={list}
        data={stories}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, position) => ({
          length: width,
          offset: width * position,
          index: position,
        })}
        onTouchStart={() => {
          setTouching(true);
        }}
        onTouchEnd={() => {
          setTouching(false);
        }}
        onTouchCancel={() => {
          setTouching(false);
        }}
        onScrollBeginDrag={() => {
          setChosen(true);
        }}
        onMomentumScrollEnd={(event) => {
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item, index: position }) => (
          <LeadStory
            item={item}
            width={width}
            lastOpened={item.id === lastOpened}
            position={t("section.slide", { current: position + 1, total: count })}
            onPress={onPress}
          />
        )}
        testID="hero-carousel"
      />
      {count > 1 && (
        <View
          style={[
            styles.controls,
            { paddingHorizontal: space.lg, minHeight: theme.touchTarget.min },
          ]}
        >
          <View
            style={[styles.dots, { gap: space.xs }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {stories.map((story, position) => (
              <View
                key={story.id}
                style={{
                  width: position === index ? space.xl : space.sm,
                  height: space.sm,
                  borderRadius: radius.full,
                  backgroundColor: position === index ? color.textBrand : color.border,
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", alignItems: "center" },
  dots: { flexDirection: "row", alignItems: "center" },
});
