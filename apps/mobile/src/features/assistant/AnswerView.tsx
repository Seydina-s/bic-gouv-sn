import type { AssistantReply, AssistantSource, Lang } from "@bgs/shared-types";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { ChatTeardropTextIcon as ChatTeardropText } from "phosphor-react-native/src/icons/ChatTeardropText";
import { HourglassMediumIcon as HourglassMedium } from "phosphor-react-native/src/icons/HourglassMedium";
import { MagnifyingGlassIcon as MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { WifiSlashIcon as WifiSlash } from "phosphor-react-native/src/icons/WifiSlash";
import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { LinkRow } from "../../components/LinkRow";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatPublishedOn } from "../news/format";
import { AnswerSkeleton } from "./AnswerSkeleton";
import { SourceRow } from "./SourceRow";
import type { AskingState } from "./useAsking";

export interface AnswerActions {
  openSource: (source: AssistantSource) => void;
  writeToGovernment: () => void;
  searchNews: () => void;
}

/** The day the assistant answers again; French writes the first of the month « 1er ». */
export function resumeDay(isoDate: string | null, lang: Lang): string {
  const day = formatPublishedOn(isoDate, lang);
  return lang === "fr" ? day.replace(/^1 /, "1er ") : day;
}

/** The answer's place under the question: it rises in as each new state comes. */
function Panel({ id, children }: { id: string; children: ReactNode }) {
  const { theme } = useTheme();
  const { color, space, radius, motion } = theme;
  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(motion.duration.normal)}
      style={{
        gap: space.lg,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: color.surface,
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Why there is no answer, said plainly with its icon. */
function Notice({
  icon,
  title,
  body,
}: {
  icon: ComponentType<PhosphorProps>;
  title?: string;
  body: string;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return (
    <View style={[styles.notice, { gap: space.md }]}>
      <Icon icon={icon} size="md" color={color.textBrand} />
      <View accessibilityRole="alert" style={[styles.flex, { gap: space.xs }]}>
        {title !== undefined && (
          <Text style={[textStyle.subtitle, { color: color.textPrimary }]}>{title}</Text>
        )}
        <Text style={[textStyle.body, { color: color.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

function Answered({ reply, actions }: { reply: AssistantReply; actions: AnswerActions }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  return (
    <>
      <Text
        selectable
        accessibilityRole="alert"
        style={[textStyle.body, { color: color.textPrimary }]}
      >
        {reply.text}
      </Text>
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" style={[textStyle.label, { color: color.textSecondary }]}>
          {t("assistant.sources")}
        </Text>
        {reply.sources.map((source) => (
          <SourceRow key={source.contentId} source={source} onOpen={actions.openSource} />
        ))}
      </View>
      <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
        {t("assistant.generated")}
      </Text>
    </>
  );
}

function ReplyBody({
  state,
  actions,
}: {
  state: Extract<AskingState, { phase: "replied" }>;
  actions: AnswerActions;
}) {
  const { t, lang } = useTranslation();
  const { reply, mode } = state;
  switch (reply.status) {
    case "answered":
      return <Answered reply={reply} actions={actions} />;
    case "not_found":
      return (
        <>
          <Notice
            icon={MagnifyingGlass}
            body={t(mode === "verify" ? "assistant.notFoundVerify" : "assistant.notFound")}
          />
          <View>
            <LinkRow
              role="button"
              label={t("assistant.elsewhere.search")}
              onPress={actions.searchNews}
            />
            <LinkRow
              role="button"
              label={t("assistant.elsewhere.write")}
              onPress={actions.writeToGovernment}
            />
          </View>
        </>
      );
    case "out_of_scope":
      return <Notice icon={ChatTeardropText} body={t("assistant.outOfScope")} />;
    case "paused":
      return (
        <Notice
          icon={HourglassMedium}
          title={t("assistant.pausedTitle")}
          body={t("assistant.pausedBody", { date: resumeDay(reply.resumesOn, lang) })}
        />
      );
    case "unavailable":
      return <Notice icon={HourglassMedium} body={t("assistant.unavailable")} />;
  }
}

/** Under the question: nothing yet, the answer being written, the answer, or why not. */
export function AnswerView({ state, actions }: { state: AskingState; actions: AnswerActions }) {
  const { t } = useTranslation();
  switch (state.phase) {
    case "idle":
      return null;
    case "asking":
      return (
        <Panel id="asking">
          <AnswerSkeleton />
        </Panel>
      );
    case "failed":
      return (
        <Panel id={`failed-${state.failure}`}>
          <Notice
            icon={state.failure === "offline" ? WifiSlash : HourglassMedium}
            body={t(`assistant.errors.${state.failure}`)}
          />
        </Panel>
      );
    case "replied":
      return (
        <Panel id={`replied-${state.reply.status}`}>
          <ReplyBody state={state} actions={actions} />
        </Panel>
      );
  }
}

const styles = StyleSheet.create({
  notice: { flexDirection: "row", alignItems: "flex-start" },
  flex: { flex: 1 },
});
