import type { NewsDetail } from "@bgs/shared-types";
import * as Speech from "expo-speech";
import { HourglassMediumIcon as HourglassMedium } from "phosphor-react-native/src/icons/HourglassMedium";
import { PauseIcon as Pause } from "phosphor-react-native/src/icons/Pause";
import { PlayIcon as Play } from "phosphor-react-native/src/icons/Play";
import { SpeakerHighIcon as SpeakerHigh } from "phosphor-react-native/src/icons/SpeakerHigh";
import { useCallback, useEffect, useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import { AccessibilityInfo, Pressable, StyleSheet, Text } from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { usePlayer, type ReadAloudStatus, type Reading } from "../player/PlayerProvider";
import { useFeature } from "../remote-config/useRemoteConfig";
import { useUsageStats } from "../usage-stats/UsageStatsProvider";
import { recordingsPlayable } from "./load-audio-player";
import { spokenPieces } from "./spoken-text";

/** The phone's French voice: every phone has one; none ships a Wolof voice yet. */
export const FRENCH_VOICE = "fr-FR";
const VOICES: Partial<Record<NewsDetail["lang"], string>> = { fr: FRENCH_VOICE };

/** How long "Voix wolof bientôt disponible" stays on the button. */
const NOTICE_MS = 3000;

/**
 * The phone voice an article is read with, or null when there is none yet for its
 * language: the button still shows and says the Wolof voice is coming (owner's
 * choice, 02/10/2026), never a French voice mangling Wolof.
 */
export function articleVoice(detail: NewsDetail): string | null {
  return VOICES[detail.lang] ?? null;
}

/** One screen's reading aloud, shared by its "Écouter" pill and its floating button. */
export interface Listening {
  /** False when the console switched reading aloud off for the moment. */
  offered: boolean;
  status: ReadAloudStatus;
  /** "Voix wolof bientôt disponible" is showing. */
  noticeShown: boolean;
  /** Listen, pause or resume, depending on where the reading is. */
  toggle: () => void;
  /** How much of this screen's reading was heard, from 0 to 1. */
  progress: SharedValue<number>;
}

/**
 * Reading aloud for one screen, through the app's one reader (it goes on when the
 * reader leaves the screen): the recording made by our voices when there is one (and
 * this build can play it), otherwise the phone's voice. `voice` null: no phone voice
 * for this language. `pieces` is only computed when the phone's voice starts.
 */
export function useListening({
  reading,
  voice,
  pieces,
  recording = null,
  onStart,
}: {
  /** What this screen reads, named in the bar pinned at the top. */
  reading: Reading;
  voice: string | null;
  pieces: () => readonly string[];
  /** Address of the recording of this text in its language, if one was made. */
  recording?: string | null;
  /** Called when reading starts (an article listened to is counted, ADM-12). */
  onStart?: () => void;
}): Listening {
  const { t } = useTranslation();
  const offered = useFeature("readAloud");
  const [playable] = useState(recordingsPlayable);
  const recordingUrl = playable ? recording : null;
  const player = usePlayer();
  const status: ReadAloudStatus = player.now?.id === reading.id ? player.status : "idle";
  const { pause, resume, play } = player;
  const [noticeShown, setNoticeShown] = useState(false);

  useEffect(() => {
    if (!noticeShown) {
      return;
    }
    const timer = setTimeout(() => {
      setNoticeShown(false);
    }, NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [noticeShown]);

  const toggle = useCallback(() => {
    if (recordingUrl === null && voice === null) {
      setNoticeShown(true);
      AccessibilityInfo.announceForAccessibility(t("content.wolofVoiceSoon"));
    } else if (status === "playing") {
      pause();
    } else if (status === "paused") {
      resume();
    } else {
      play(
        reading,
        recordingUrl === null
          ? { kind: "voice", language: voice ?? FRENCH_VOICE, pieces: pieces() }
          : { kind: "recording", url: recordingUrl },
      );
      onStart?.();
    }
  }, [recordingUrl, voice, status, pause, resume, play, reading, pieces, onStart, t]);

  return { offered, status, noticeShown, toggle, progress: player.progress };
}

/** The article's reading: its title, then its text, in the article's language. */
export function useArticleListening(detail: NewsDetail): Listening {
  const { record } = useUsageStats();
  return useListening({
    reading: { id: detail.id, title: detail.title, path: `/article/${detail.id}` },
    voice: articleVoice(detail),
    pieces: () => spokenPieces(detail.title, detail.blocks, Speech.maxSpeechInputLength),
    recording: detail.audio?.url ?? null,
    onStart: () => {
      record({ type: "listen", articleId: detail.id });
    },
  });
}

/** What the button shows at each point of the reading. */
export function useListenFace(listening: Listening) {
  const { t } = useTranslation();
  if (listening.noticeShown) {
    return {
      icon: HourglassMedium,
      label: t("content.wolofVoiceSoon"),
      action: t("content.listen"),
    };
  }
  switch (listening.status) {
    case "playing":
      return { icon: Pause, label: t("content.pause"), action: t("content.pauseReading") };
    case "paused":
      return { icon: Play, label: t("content.resume"), action: t("content.resumeReading") };
    case "idle":
      return { icon: SpeakerHigh, label: t("content.listen"), action: t("content.listen") };
  }
}

/**
 * "Écouter" pill on glass (it reads over any picture, as on an article photo).
 * Becomes "Pause", then "Reprendre", while reading.
 */
export function ListenPill({ listening }: { listening: Listening }) {
  const { theme } = useTheme();
  const face = useListenFace(listening);
  const { color, space, textStyle, radius, touchTarget } = theme;
  if (!listening.offered) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={face.label}
      accessibilityState={{ selected: listening.status === "playing" }}
      onPress={listening.toggle}
      style={({ pressed }) => [
        styles.pill,
        {
          minHeight: touchTarget.min,
          paddingHorizontal: space.lg,
          gap: space.sm,
          borderRadius: radius.full,
          borderColor: color.glassBorder,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      <GlassBackdrop />
      <Icon icon={face.icon} weight="fill" color={color.textBrand} />
      <Text style={[textStyle.label, { color: color.textPrimary }]}>{face.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
