import {
  ASSISTANT_QUESTION_MAX,
  ASSISTANT_QUESTION_MIN,
  type AssistantMode,
  type AssistantSource,
} from "@bgs/shared-types";
import { useRouter } from "expo-router";
import { ChatTeardropTextIcon as ChatTeardropText } from "phosphor-react-native/src/icons/ChatTeardropText";
import { SealCheckIcon as SealCheck } from "phosphor-react-native/src/icons/SealCheck";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { SegmentedChoice } from "../../components/SegmentedChoice";
import { AnswerView, type AnswerActions } from "../../features/assistant/AnswerView";
import { useAsking } from "../../features/assistant/useAsking";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * The assistant (owner's decision of 07/10/2026): one question, or one claim to
 * check (« Est-ce vrai ? »), answered from the official publications only, with
 * the sources to open. One question at a time, like a search, not a chat.
 */
function Assistant() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const [mode, setMode] = useState<AssistantMode>("ask");
  const [question, setQuestion] = useState("");
  const { state, submit } = useAsking();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  const asking = state.phase === "asking";
  const ready = question.trim().length >= ASSISTANT_QUESTION_MIN && !asking;
  const label = t(`assistant.labels.${mode}`);

  const actions: AnswerActions = {
    openSource: (source: AssistantSource) => {
      if (source.kind === "news-article") {
        router.push({ pathname: "/article/[id]", params: { id: source.contentId } });
      } else if (source.slug !== null) {
        router.push({ pathname: "/procedure/[slug]", params: { slug: source.slug } });
      } else {
        void Linking.openURL(source.url);
      }
    },
    writeToGovernment: () => {
      router.navigate("/participate");
    },
    searchNews: () => {
      router.push("/search");
    },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: color.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.lg,
          paddingBottom: bottomInset + space.xxl,
          gap: space.xl,
          width: "100%",
          maxWidth: layout.readingMaxWidth,
          alignSelf: "center",
        }}
      >
        <View style={{ gap: space.sm }}>
          <Text
            accessibilityRole="header"
            style={[textStyle.display, { color: color.textPrimary }]}
          >
            {t("tabs.assistant")}
          </Text>
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("assistant.intro")}
          </Text>
        </View>
        <SegmentedChoice<AssistantMode>
          title={t("assistant.modeTitle")}
          selected={mode}
          onSelect={setMode}
          segments={[
            { value: "ask", label: t("assistant.modes.ask"), icon: ChatTeardropText },
            {
              value: "verify",
              label: t("assistant.modes.verify"),
              spokenLabel: t("assistant.modes.verifySpoken"),
              icon: SealCheck,
            },
          ]}
        />
        <View style={{ gap: space.sm }}>
          <Text style={[textStyle.label, { color: color.textPrimary }]}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={t(`assistant.hints.${mode}`)}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={ASSISTANT_QUESTION_MAX}
            textAlignVertical="top"
            placeholder={t(`assistant.hints.${mode}`)}
            placeholderTextColor={color.textTertiary}
            style={[
              textStyle.body,
              {
                color: color.textPrimary,
                minHeight: touchTarget.min * 2,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: color.borderStrong,
                backgroundColor: color.background,
              },
            ]}
          />
          <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
            {t("assistant.personal")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready, busy: asking }}
            disabled={!ready}
            onPress={() => void submit(question, mode, lang)}
            style={({ pressed }) => [
              styles.submit,
              {
                minHeight: touchTarget.min,
                borderRadius: radius.md,
                backgroundColor: pressed ? color.primaryPressed : color.primary,
                opacity: ready ? 1 : theme.opacity.disabled,
              },
            ]}
          >
            <Text style={[textStyle.label, { color: color.onPrimary }]}>
              {t(`assistant.submit.${mode}`)}
            </Text>
          </Pressable>
        </View>
        <AnswerView state={state} actions={actions} />
      </ScrollView>
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
  submit: { alignItems: "center", justifyContent: "center" },
});
