import { MESSAGE_TOPICS, type MessageTopic } from "@bgs/shared-types";
import { BankIcon as Bank } from "phosphor-react-native/src/icons/Bank";
import { ChatCircleDotsIcon as ChatCircleDots } from "phosphor-react-native/src/icons/ChatCircleDots";
import { DeviceMobileIcon as DeviceMobile } from "phosphor-react-native/src/icons/DeviceMobile";
import { useState } from "react";
import { createParticipationClient } from "../../api/participation-client";
import { API_BASE_URL } from "../../api/base-url";
import { useTranslation } from "../../i18n/useTranslation";
import { Field, MAX_TEXT, MIN_TEXT, SendRow } from "./FormParts";
import {
  ChoiceTiles,
  NextButton,
  StepBody,
  StepFooter,
  StepHeader,
  type Choice,
} from "./GuidedSteps";
import { SentCard } from "./SentCard";
import { useSending } from "./useSending";

const client = createParticipationClient({ baseUrl: API_BASE_URL });

const ICONS: Record<MessageTopic, Choice<MessageTopic>["icon"]> = {
  gouvernement: Bank,
  application: DeviceMobile,
  autre: ChatCircleDots,
};

const STEPS = 2;

/**
 * "Écrire au gouvernement" (decision of the user, 01/10/2026) in two steps: what
 * the message is about, then the message. Anonymous; read by the team.
 */
export function MessageFlow() {
  const { t, lang } = useTranslation();
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState<MessageTopic | null>(null);
  const [text, setText] = useState("");
  const { state, submit, reset } = useSending((key) =>
    client.sendMessage({ topic: topic ?? "autre", text, lang }, key),
  );
  const choices = MESSAGE_TOPICS.map((value) => ({
    value,
    label: t(`participate.topics.${value}`),
    hint: t(`participate.topicHints.${value}`),
    icon: ICONS[value],
  }));

  if (state.phase === "sent") {
    return (
      <SentCard
        message={t("participate.messageSent")}
        again={t("participate.again.message")}
        onAgain={() => {
          setStep(1);
          setTopic(null);
          setText("");
          reset();
        }}
      />
    );
  }
  if (step === 1) {
    const question = t("participate.questions.topic");
    return (
      <StepBody step={1}>
        <StepHeader step={1} count={STEPS} question={question} />
        <ChoiceTiles title={question} choices={choices} selected={topic} onSelect={setTopic} />
        <StepFooter onBack={null}>
          <NextButton
            label={t("participate.next")}
            enabled={topic !== null}
            onPress={() => {
              setStep(2);
            }}
          />
        </StepFooter>
      </StepBody>
    );
  }
  return (
    <StepBody step={2}>
      <StepHeader step={2} count={STEPS} question={t("participate.questions.message")} />
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
      <StepFooter
        onBack={() => {
          setStep(1);
        }}
      >
        <SendRow
          state={state}
          ready={text.trim().length >= MIN_TEXT}
          sentMessage={t("participate.messageSent")}
          onSend={() => void submit()}
        />
      </StepFooter>
    </StepBody>
  );
}
