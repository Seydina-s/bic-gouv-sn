import type { AssistantSource } from "@bgs/shared-types";
import { useRouter } from "expo-router";
import { NotePencilIcon as NotePencil } from "phosphor-react-native/src/icons/NotePencil";
import { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark } from "../../components/BrandMark";
import { useTabBarInset } from "../../components/GlassTabBar";
import { Icon } from "../../components/Icon";
import { AssistantTurn, UserBubble, type ChatActions } from "../../features/assistant/ChatMessage";
import { Composer } from "../../features/assistant/Composer";
import { useConversation, type ChatTurn } from "../../features/assistant/useConversation";
import { useVoiceInput } from "../../features/assistant/useVoiceInput";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** The official mark over the welcome words, before the first message. */
const WELCOME_MARK_HEIGHT = 96;

/**
 * The assistant as a conversation (owner's decision of 08/10/2026): the welcome
 * words under the official mark, then the messages, and one field at the bottom to
 * write or dictate a question or a claim to check. Answers come from the official
 * sources only, with them to open.
 */
function Assistant() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const scroll = useRef<ScrollView>(null);
  const [draft, setDraft] = useState("");
  const { turns, busy, send, reset } = useConversation();
  const voice = useVoiceInput(lang, setDraft);
  const { color, space, textStyle, layout, touchTarget } = theme;

  const submit = useCallback(() => {
    const question = draft.trim();
    if (question === "" || busy) {
      return;
    }
    setDraft("");
    void send(question, lang);
  }, [draft, busy, send, lang]);

  const actions: ChatActions = {
    openSource: (source: AssistantSource) => {
      if (source.kind === "news-article") {
        router.push({ pathname: "/article/[id]", params: { id: source.contentId } });
      } else if (source.slug !== null) {
        router.push({ pathname: "/procedure/[slug]", params: { slug: source.slug } });
      } else {
        void Linking.openURL(source.url);
      }
    },
    searchNews: () => {
      router.push("/search");
    },
    writeToGovernment: () => {
      router.navigate("/participate");
    },
    retry: (turn: ChatTurn) => {
      void send(turn.question, lang);
    },
  };

  const column = {
    width: "100%" as const,
    maxWidth: layout.readingMaxWidth,
    alignSelf: "center" as const,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: color.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          column,
          {
            paddingTop: insets.top + space.sm,
            paddingHorizontal: space.lg,
            minHeight: touchTarget.min,
          },
        ]}
      >
        <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
          {t("tabs.assistant")}
        </Text>
        {turns.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("assistant.newChat")}
            onPress={reset}
            style={({ pressed }) => [
              styles.headerAction,
              { width: touchTarget.min, height: touchTarget.min, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Icon icon={NotePencil} size="md" color={color.textBrand} />
          </Pressable>
        )}
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          scroll.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={[
          column,
          { flexGrow: 1, paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.xl },
        ]}
      >
        {turns.length === 0 ? (
          <Animated.View
            entering={FadeIn.duration(theme.motion.duration.slow)}
            style={[styles.welcome, { gap: space.lg, paddingHorizontal: space.lg }]}
          >
            <BrandMark height={WELCOME_MARK_HEIGHT} />
            <Text style={[textStyle.body, styles.center, { color: color.textTertiary }]}>
              {t("assistant.welcome")}
            </Text>
          </Animated.View>
        ) : (
          turns.map((turn) => (
            <View key={turn.id} style={{ gap: space.lg }}>
              <UserBubble turn={turn} />
              <AssistantTurn turn={turn} actions={actions} />
            </View>
          ))
        )}
      </ScrollView>
      <View
        style={[
          column,
          {
            paddingHorizontal: space.md,
            paddingTop: space.xs,
            paddingBottom: bottomInset + space.sm,
          },
        ]}
      >
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={submit}
          busy={busy}
          listening={voice.listening}
          onListen={() => void voice.start()}
          onStopListening={voice.stop}
          voiceProblem={voice.problem}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Behind the "assistant" kill switch: off, it says so plainly. */
export default function AssistantScreen() {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="assistant" title={t("tabs.assistant")}>
      <Assistant />
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerAction: { alignItems: "center", justifyContent: "center" },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
});
