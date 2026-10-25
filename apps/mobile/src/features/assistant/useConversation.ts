import type { AssistantFlagSubmission, AssistantReply, Lang } from "@bgs/shared-types";
import { useCallback, useRef, useState } from "react";
import { AskError, type AskFailure, createAssistantClient } from "../../api/assistant-client";
import { API_BASE_URL } from "../../api/base-url";
import { smallTalkOf, type SmallTalk } from "./small-talk";

const client = createAssistantClient({ baseUrl: API_BASE_URL });

/** The exchanges kept on screen: the oldest go once there are more. */
const KEPT_TURNS = 30;

/** One question, in the language it was asked in, and what became of it. */
export type ChatTurn = { id: number; question: string; lang: Lang } & (
  | { state: "pending" }
  | { state: "replied"; reply: AssistantReply }
  | { state: "courtesy"; kind: SmallTalk }
  | { state: "failed"; failure: AskFailure }
);

/**
 * The discussion with the assistant, kept on the phone only while the app is open:
 * nothing is saved. Each question is answered on its own, from the official base.
 */
/**
 * What « Signaler cette réponse » sends for a turn the assistant answered or refused;
 * null for any other turn (a pause, an error, a courtesy reply): there is nothing to flag.
 */
export function flagOf(turn: ChatTurn): AssistantFlagSubmission | null {
  if (turn.state !== "replied") {
    return null;
  }
  const { status, text, sources } = turn.reply;
  if (status !== "answered" && status !== "not_found" && status !== "out_of_scope") {
    return null;
  }
  return { question: turn.question, lang: turn.lang, mode: "ask", status, answer: text, sources };
}

export function useConversation(ask = client.ask, sendFlag = client.flag) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const next = useRef(1);

  const settle = useCallback((id: number, settled: Partial<ChatTurn> & Pick<ChatTurn, "state">) => {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? ({ ...turn, ...settled } as ChatTurn) : turn)),
    );
  }, []);

  const send = useCallback(
    async (question: string, lang: Lang) => {
      const id = next.current;
      next.current += 1;
      const text = question.trim();
      const courtesy = smallTalkOf(text);
      if (courtesy !== null) {
        // "Bonjour", "Merci": answered here, at once, without using a question.
        setTurns((current) => [
          ...current.slice(-(KEPT_TURNS - 1)),
          { id, question: text, lang, state: "courtesy", kind: courtesy },
        ]);
        return;
      }
      setTurns((current) => [
        ...current.slice(-(KEPT_TURNS - 1)),
        { id, question: text, lang, state: "pending" },
      ]);
      try {
        // One mode for both: the assistant tells a question from a claim to check.
        settle(id, { state: "replied", reply: await ask({ question: text, mode: "ask", lang }) });
      } catch (error) {
        settle(id, {
          state: "failed",
          failure: error instanceof AskError ? error.failure : "failed",
        });
      }
    },
    [ask, settle],
  );

  const reset = useCallback(() => {
    setTurns([]);
  }, []);

  /** True once the flag reached the team; false when it could not be sent. */
  const flag = useCallback(
    async (turn: ChatTurn): Promise<boolean> => {
      const submission = flagOf(turn);
      if (submission === null) {
        return false;
      }
      try {
        await sendFlag(submission);
        return true;
      } catch {
        return false;
      }
    },
    [sendFlag],
  );

  const busy = turns.some((turn) => turn.state === "pending");
  return { turns, busy, send, reset, flag };
}
