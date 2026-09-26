import type { NewsSummary } from "@bgs/shared-types";
import { useIsFocused } from "expo-router";
import { PauseIcon as Pause } from "phosphor-react-native/src/icons/Pause";
import { PlayIcon as Play } from "phosphor-react-native/src/icons/Play";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { IconButton } from "../../components/IconButton";
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

/**
 * "À la une": the newest pictured stories take turns every few seconds, sliding
 * sideways. Swipeable at any time. Turning stops while a finger is on it, when the
 * reader pauses it, off screen, and for good with "reduce motion" or a screen reader
 * (WCAG 2.2.2): the stories then stay reachable by swiping.
 */
export function HeroCarousel({ stories, width, lastOpened, onPress }: HeroCarouselProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const list = useRef<FlatList<NewsSummary>>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touching, setTouching] = useState(false);
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReader();
  const focused = useIsFocused();
  const { color, space, radius } = theme;
  const count = stories.length;
  const canTurn = count > 1 && reduceMotion === false && screenReader === false;
  const turning = canTurn && !paused && !touching && focused;

  useEffect(() => {
    if (!turning) {
      return;
    }
    const timer = setTimeout(() => {
      const next = (index + 1) % count;
      list.current?.scrollToOffset({ offset: next * width, animated: true });
      setIndex(next);
    }, theme.motion.duration.carouselDwell);
    return () => {
      clearTimeout(timer);
    };
  }, [turning, index, count, width, theme.motion.duration.carouselDwell]);

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
        <View style={[styles.controls, { paddingHorizontal: space.lg, gap: space.sm }]}>
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
          {canTurn && (
            <IconButton
              icon={paused ? Play : Pause}
              label={paused ? t("section.play") : t("section.pause")}
              onPress={() => {
                setPaused(!paused);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", alignItems: "center" },
});
