import { MESSAGE_TOPICS, type MessageTopic } from "@bgs/shared-types";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { createParticipationClient } from "../../api/participation-client";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { SectionChip } from "../news/SectionChip";
import { Field, MAX_TEXT, MIN_TEXT, SendRow } from "./FormParts";
import { useSending } from "./useSending";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createParticipationClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/**
 * "Écrire au gouvernement" (decision of the user, 01/10/2026), first on the page:
 * an idea to serve citizens better, an opinion on the app, anything else.
 */
export function MessageBox() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [topic, setTopic] = useState<MessageTopic>("gouvernement");
  const [text, setText] = useState("");
  const { state, submit, reset } = useSending((key) =>
    client.sendMessage({ topic, text, lang }, key),
  );
  const { color, space, textStyle } = theme;

  return (
    <View style={{ gap: space.md }}>
      <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
        {t("participate.messageTitle")}
      </Text>
      <Text style={[textStyle.body, { color: color.textSecondary }]}>
        {t("participate.messageIntro")}
      </Text>
      <Text style={[textStyle.label, { color: color.textPrimary }]}>{t("participate.topic")}</Text>
      <View style={[styles.chips, { gap: space.sm }]}>
        {MESSAGE_TOPICS.map((one) => (
          <SectionChip
            key={one}
            category={null}
            label={t(`participate.topics.${one}`)}
            active={topic === one}
            onPress={() => {
              setTopic(one);
            }}
          />
        ))}
      </View>
      <Field
        label={t("participate.messageLabel")}
        value={text}
        multiline
        maxLength={MAX_TEXT}
        onChange={(next) => {
          setText(next);
          reset();
        }}
      />
      <SendRow
        state={state}
        ready={text.trim().length >= MIN_TEXT}
        sentMessage={t("participate.messageSent")}
        onSend={() => {
          void submit().then((sent) => {
            if (sent) {
              setText("");
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
