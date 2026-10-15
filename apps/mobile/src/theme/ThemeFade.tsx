import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Theme } from "@bgs/ui";
import { loadScreenCapture } from "./screen-capture";
import { useReduceMotion } from "./useSystemAccessibility";

/** Colour of the veil when the theme changes from `before` to `after`; null: none. */
export function fadeFrom(before: Theme, after: Theme, reduceMotion: boolean | null): string | null {
  return before.scheme === after.scheme || reduceMotion === true ? null : before.color.background;
}

/** Longest wait for the picture of the screen before switching without it. */
const CAPTURE_WAIT_MS = 400;

const capture = loadScreenCapture();

type Cover = { kind: "veil"; color: string } | { kind: "picture"; uri: string };

/**
 * Light and dark modes dissolve into each other (owner's request, 02/10/2026, and
 * again on 14/10: the plain veil only flashed the old background). A picture of the
 * screen in the old mode is laid over it, the app switches underneath, then the
 * picture fades away: the whole screen cross-fades. Without the capture module (older
 * builds), or when the picture is late, the old background fades instead. Nothing
 * takes a touch, and the switch is immediate when the phone asks for less motion.
 */
export function useThemeTransition(target: Theme): { theme: Theme; layer: ReactNode } {
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(target);
  const [cover, setCover] = useState<Cover | null>(null);
  const shownRef = useRef(target);
  const latest = useRef(target);
  const opacity = useSharedValue(0);
  const duration = target.motion.duration.themeFade;

  const show = useCallback((theme: Theme) => {
    shownRef.current = theme;
    setShown(theme);
  }, []);

  const uncover = useCallback((done: Cover) => {
    // A newer change may have laid its own cover meanwhile: only this one goes.
    setCover((current) => (current === done ? null : current));
    if (done.kind === "picture") {
      capture?.release(done.uri);
    }
  }, []);

  const fadeAway = useCallback(
    (done: Cover) => {
      opacity.set(
        withTiming(0, { duration, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished === true) {
            scheduleOnRN(uncover, done);
          }
        }),
      );
    },
    [opacity, duration, uncover],
  );

  const veil = useCallback(
    (from: Theme, to: Theme) => {
      const done: Cover = { kind: "veil", color: from.color.background };
      opacity.set(1);
      setCover(done);
      show(to);
      fadeAway(done);
    },
    [opacity, show, fadeAway],
  );

  useLayoutEffect(() => {
    latest.current = target;
    const from = shownRef.current;
    if (fadeFrom(from, target, reduceMotion) === null) {
      show(target);
      return;
    }
    if (capture === null) {
      veil(from, target);
      return;
    }
    let settled = false;
    const late = setTimeout(() => {
      settled = true;
      veil(from, target);
    }, CAPTURE_WAIT_MS);
    capture.take().then(
      (uri) => {
        if (settled) {
          capture.release(uri);
          return;
        }
        settled = true;
        clearTimeout(late);
        opacity.set(1);
        // The switch waits for the picture to be on screen (onPictureShown).
        setCover({ kind: "picture", uri });
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(late);
          veil(from, target);
        }
      },
    );
    return () => {
      settled = true;
      clearTimeout(late);
    };
  }, [target, reduceMotion, show, veil, opacity]);

  const onPictureShown = useCallback(
    (done: Cover) => {
      requestAnimationFrame(() => {
        show(latest.current);
        fadeAway(done);
      });
    },
    [show, fadeAway],
  );

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const layer =
    cover === null ? null : (
      <Animated.View
        testID="theme-fade"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          cover.kind === "veil" && { backgroundColor: cover.color },
          fade,
        ]}
      >
        {cover.kind === "picture" && (
          <Image
            source={{ uri: cover.uri }}
            fadeDuration={0}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            onLoad={() => {
              onPictureShown(cover);
            }}
            onError={() => {
              show(latest.current);
              uncover(cover);
            }}
          />
        )}
      </Animated.View>
    );
  return { theme: shown, layer };
}
