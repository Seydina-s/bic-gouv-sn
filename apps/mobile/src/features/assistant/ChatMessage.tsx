import type { AssistantSource, Lang } from "@bgs/shared-types";
import { ArrowClockwiseIcon as ArrowClockwise } from "phosphor-react-native/src/icons/ArrowClockwise";
import { FlagIcon as Flag } from "phosphor-react-native/src/icons/Flag";
import { ListChecksIcon as ListChecks } from "phosphor-react-native/src/icons/ListChecks";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { NewspaperIcon as Newspaper } from "phosphor-react-native/src/icons/Newspaper";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BrandMark } from "../../components/BrandMark";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { formatPublishedOn } from "../news/format";
import type { ChatTurn } from "./useConversation";

export interface ChatActions {
  openSource: (source: AssistantSource) => void;
  searchNews: () => void;
  writeToGovernment: () => void;
  retry: (turn: ChatTurn) => void;
  /** « Signaler cette réponse »: true once the flag reached the team. */
  flag: (turn: ChatTurn) => Promise<boolean>;
}

/** The person's message, on the right, in a soft green bubble. */
export function UserBubble({ turn }: { turn: ChatTurn }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle } = theme;
  return (
    <Animated.View
      entering={FadeInDown.duration(theme.motion.duration.normal)}
      style={[styles.right, { gap: space.xxs }]}
    >
      <View
        accessible
        accessibilityLabel={`${t("assistant.you")} : ${turn.question}`}
        style={{
          maxWidth: "85%",
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderRadius: radius.lg,
          borderBottomRightRadius: radius.sm,
          backgroundColor: color.primaryContainer,
        }}
      >
        <Text selectable style={[textStyle.body, { color: color.onPrimaryContainer }]}>
          {turn.question}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Three dots breathing one after the other while the answer is written. */
function TypingDots() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { color, space } = theme;
  return (
    <View
      accessible
      accessibilityLabel={t("assistant.thinking")}
      accessibilityLiveRegion="polite"
      style={[styles.row, { gap: space.xs, paddingVertical: space.sm }]}
    >
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} still={reduceMotion !== false} color={color.textTertiary} />
      ))}
    </View>
  );
}

function Dot({ index, still, color }: { index: number; still: boolean; color: string }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = still
      ? 0
      : withDelay(
          index * 160,
          withRepeat(
            withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })),
            -1,
          ),
        );
  }, [index, still, lift]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + lift.value * 0.65,
    transform: [{ translateY: -lift.value * 3 }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** What each kind of source looks like: an article, a procedure, a government office. */
const SOURCE_ICONS: Record<AssistantSource["kind"], ComponentType<PhosphorProps>> = {
  "news-article": Newspaper,
  procedure: ListChecks,
  service: MapPin,
};

/** One official page the answer comes from, as a small tag to open it. */
function SourceChip({
  source,
  onOpen,
}: {
  source: AssistantSource;
  onOpen: (source: AssistantSource) => void;
}) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const kind = t(`assistant.sourceKinds.${source.kind}`);
  const date = formatPublishedOn(source.publishedOn, lang);
  return (
    <Pressable
      accessibilityRole={source.kind === "procedure" && source.slug === null ? "link" : "button"}
      accessibilityLabel={t("assistant.sourceSpoken", { kind, title: source.title, date })}
      onPress={() => {
        onOpen(source);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.sm,
          minHeight: touchTarget.min,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.border,
          backgroundColor: pressed ? color.primaryContainer : color.surface,
        },
      ]}
    >
      <Icon icon={SOURCE_ICONS[source.kind]} size="sm" color={color.textBrand} />
      <Text numberOfLines={1} style={[textStyle.label, styles.flex, { color: color.textPrimary }]}>
        {source.title}
      </Text>
    </Pressable>
  );
}

/** A small action under an answer: search, write, try again. */
function TurnAction({
  icon,
  label,
  onPress,
}: {
  icon?: ComponentType<PhosphorProps>;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, radius, textStyle, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          alignSelf: "flex-start",
          gap: space.xs,
          minHeight: touchTarget.min,
          paddingHorizontal: space.md,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.borderStrong,
          backgroundColor: pressed ? color.primaryContainer : undefined,
        },
      ]}
    >
      {icon !== undefined && <Icon icon={icon} size="sm" color={color.textBrand} />}
      <Text style={[textStyle.label, { color: color.textBrand }]}>{label}</Text>
    </Pressable>
  );
}

type FlagState = "idle" | "confirming" | "sending" | "sent" | "failed";

/**
 * « Signaler cette réponse » (AST-30e, owner's decisions of 19 and 25/10/2026): discreet
 * under the answer, then one confirmation that says exactly what is sent and for how
 * long, before anything leaves the phone. Two choices only; nothing is sent by a slip.
 */
function FlagAnswer({ turn, onFlag }: { turn: ChatTurn; onFlag: ChatActions["flag"] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const [state, setState] = useState<FlagState>("idle");
  const note = (text: string) => (
    <Text
      accessibilityLiveRegion="polite"
      style={[textStyle.bodySmall, { color: color.textSecondary }]}
    >
      {text}
    </Text>
  );
  if (state === "sent") {
    return note(t("assistant.flag.sent"));
  }
  if (state === "idle" || state === "failed") {
    return (
      <View style={{ gap: space.xs }}>
        {state === "failed" && note(t("assistant.flag.failed"))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setState("confirming");
          }}
          style={({ pressed }) => [
            styles.row,
            {
              alignSelf: "flex-start",
              gap: space.xs,
              minHeight: touchTarget.min,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Icon icon={Flag} size="sm" color={color.textSecondary} />
          <Text style={[textStyle.label, { color: color.textSecondary }]}>
            {t("assistant.flag.action")}
          </Text>
        </Pressable>
      </View>
    );
  }
  const sending = state === "sending";
  const button = {
    minHeight: touchTarget.min,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    justifyContent: "center" as const,
  };
  return (
    <View
      style={{
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.border,
        backgroundColor: color.surface,
      }}
    >
      {note(t("assistant.flag.notice"))}
      <View style={[styles.wrap, { gap: space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sending, busy: sending }}
          disabled={sending}
          onPress={() => {
            setState("sending");
            void onFlag(turn).then((sent) => {
              setState(sent ? "sent" : "failed");
            });
          }}
          style={({ pressed }) => [
            button,
            { backgroundColor: pressed ? color.primaryPressed : color.primary },
          ]}
        >
          <Text style={[textStyle.label, { color: color.onPrimary }]}>
            {sending ? t("assistant.flag.sending") : t("assistant.flag.send")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={sending}
          onPress={() => {
            setState("idle");
          }}
          style={({ pressed }) => [
            button,
            {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: color.borderStrong,
              backgroundColor: pressed ? color.primaryContainer : undefined,
            },
          ]}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>
            {t("assistant.flag.cancel")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Said({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const { theme } = useTheme();
  const { textStyle, color } = theme;
  return (
    <Text
      selectable
      accessibilityLiveRegion="polite"
      style={[textStyle.body, { color: muted ? color.textSecondary : color.textPrimary }]}
    >
      {children}
    </Text>
  );
}

function TurnBody({ turn, actions }: { turn: ChatTurn; actions: ChatActions }) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const { color, space, textStyle } = theme;
  if (turn.state === "pending") {
    return <TypingDots />;
  }
  if (turn.state === "courtesy") {
    return <Said>{t(`assistant.courtesy.${turn.kind}`)}</Said>;
  }
  if (turn.state === "failed") {
    return (
      <>
        <Said muted>{t(`assistant.errors.${turn.failure}`)}</Said>
        <TurnAction
          icon={ArrowClockwise}
          label={t("assistant.retry")}
          onPress={() => {
            actions.retry(turn);
          }}
        />
      </>
    );
  }
  const { reply } = turn;
  switch (reply.status) {
    case "answered":
      return (
        <>
          <Said>{reply.text}</Said>
          <View style={{ gap: space.xs }}>
            {reply.sources.map((source) => (
              <SourceChip key={source.contentId} source={source} onOpen={actions.openSource} />
            ))}
          </View>
          <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
            {t("assistant.generated")}
          </Text>
          <FlagAnswer turn={turn} onFlag={actions.flag} />
        </>
      );
    case "not_found":
      return (
        <>
          <Said muted>{t("assistant.notFound")}</Said>
          <View style={[styles.wrap, { gap: space.sm }]}>
            <TurnAction label={t("assistant.elsewhere.search")} onPress={actions.searchNews} />
            <TurnAction
              label={t("assistant.elsewhere.write")}
              onPress={actions.writeToGovernment}
            />
          </View>
          <FlagAnswer turn={turn} onFlag={actions.flag} />
        </>
      );
    case "out_of_scope":
      return (
        <>
          <Said muted>{t("assistant.outOfScope")}</Said>
          <FlagAnswer turn={turn} onFlag={actions.flag} />
        </>
      );
    case "paused":
      return (
        <>
          <Text style={[textStyle.subtitle, { color: color.textPrimary }]}>
            {t("assistant.pausedTitle")}
          </Text>
          <Said muted>{t("assistant.pausedBody", { date: resumeDay(reply.resumesOn, lang) })}</Said>
        </>
      );
    case "unavailable":
      // Often a passing slowness of the network: trying again usually answers.
      return (
        <>
          <Said muted>{t("assistant.unavailable")}</Said>
          <TurnAction
            icon={ArrowClockwise}
            label={t("assistant.retry")}
            onPress={() => {
              actions.retry(turn);
            }}
          />
        </>
      );
  }
}

/** The day the assistant answers again; French writes the first of the month « 1er ». */
export function resumeDay(isoDate: string | null, lang: Lang): string {
  const day = formatPublishedOn(isoDate, lang);
  return lang === "fr" ? day.replace(/^1 /, "1er ") : day;
}

/** The assistant's turn, on the left: the BIC-GOUV mark as its face, then the words. */
export function AssistantTurn({ turn, actions }: { turn: ChatTurn; actions: ChatActions }) {
  const { theme } = useTheme();
  const { color, space } = theme;
  return (
    <Animated.View
      entering={FadeInDown.duration(theme.motion.duration.normal)}
      style={[styles.row, styles.top, { gap: space.md }]}
    >
      <View
        style={[styles.mark, { backgroundColor: color.surfaceRaised, borderColor: color.border }]}
      >
        <BrandMark height={MARK * 0.62} />
      </View>
      <View style={[styles.flex, { gap: space.md }]}>
        <TurnBody turn={turn} actions={actions} />
      </View>
    </Animated.View>
  );
}

const MARK = 32;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  top: { alignItems: "flex-start" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  right: { alignItems: "flex-end" },
  flex: { flex: 1 },
  mark: {
    borderWidth: StyleSheet.hairlineWidth,
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
