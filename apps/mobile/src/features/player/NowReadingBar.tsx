import { usePathname, useRouter } from "expo-router";
import { PauseIcon as Pause } from "phosphor-react-native/src/icons/Pause";
import { PlayIcon as Play } from "phosphor-react-native/src/icons/Play";
import { XIcon as X } from "phosphor-react-native/src/icons/X";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, ReduceMotion, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { ProgressRing } from "../../components/ProgressRing";
import { dimWhenPressed } from "../../components/press-feedback";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { usePlayer } from "./PlayerProvider";

/** Whether the bar shows: something is read, away from the screen that reads it. */
export function useNowReadingShown(): boolean {
  const { now } = usePlayer();
  const pathname = usePathname();
  return now !== null && pathname !== now.path;
}

/**
 * The reading under way, pinned at the top of every other screen (owner's request,
 * 14/10/2026, as WhatsApp does with a voice message): pause or resume with the ring of
 * what was heard, its title to go back to it, a cross to stop it. It sits in the flow,
 * above the screens, so it never covers a back button.
 */
export function NowReadingBar() {
  const player = usePlayer();
  const shown = useNowReadingShown();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, touchTarget, borderWidth, motion, layout } = theme;
  if (!shown || player.now === null) {
    return null;
  }
  const { path, title } = player.now;
  const playing = player.status === "playing";
  return (
    <Animated.View
      entering={SlideInUp.duration(motion.duration.normal).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(motion.duration.exitNormal).reduceMotion(ReduceMotion.System)}
      style={[styles.bar, { paddingTop: insets.top, borderBottomColor: color.glassBorder }]}
      testID="now-reading"
    >
      <GlassBackdrop />
      <View
        style={[
          styles.row,
          {
            gap: space.sm,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            maxWidth: layout.readingMaxWidth + space.xxxl,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? t("content.pauseReading") : t("content.resumeReading")}
          onPress={playing ? player.pause : player.resume}
          style={dimWhenPressed(
            [styles.round, { width: touchTarget.min, height: touchTarget.min }],
            theme.opacity.controlPressed,
          )}
        >
          <ProgressRing
            progress={player.progress}
            size={touchTarget.min}
            thickness={borderWidth.progress}
            color={color.textBrand}
            trackColor={color.border}
          />
          <Icon icon={playing ? Pause : Play} weight="fill" color={color.textBrand} />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("content.nowReading", { title })}
          onPress={() => {
            router.push(path);
          }}
          style={dimWhenPressed(
            [styles.title, { minHeight: touchTarget.min }],
            theme.opacity.controlPressed,
          )}
        >
          <Text numberOfLines={1} style={[textStyle.label, { color: color.textPrimary }]}>
            {title}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("content.stopReading")}
          onPress={player.stop}
          style={dimWhenPressed(
            [styles.round, { width: touchTarget.min, height: touchTarget.min }],
            theme.opacity.controlPressed,
          )}
        >
          <Icon icon={X} color={color.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    overflow: "hidden",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", alignItems: "center", width: "100%" },
  round: { alignItems: "center", justifyContent: "center" },
  title: { flex: 1, justifyContent: "center" },
});
