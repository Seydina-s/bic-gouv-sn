import type { AssistantReply, Lang } from "@bgs/shared-types";
import { useCallback, useRef, useState } from "react";
import { AskError, type AskFailure, createAssistantClient } from "../../api/assistant-client";
import { API_BASE_URL } from "../../api/base-url";

const client = createAssistantClient({ baseUrl: API_BASE_URL });

/** The exchanges kept on screen: the oldest go once there are more. */
const KEPT_TURNS = 30;

/** One question and what became of it. */
export type ChatTurn = { id: number; question: string } & (
  | { state: "pending" }
  | { state: "replied"; reply: AssistantReply }
  | { state: "failed"; failure: AskFailure }
);

/**
 * The discussion with the assistant, kept on the phone only while the app is open:
 * nothing is saved. Each question is answered on its own, from the official base.
 */
export function useConversation(ask = client.ask) {
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
      setTurns((current) => [
        ...current.slice(-(KEPT_TURNS - 1)),
        { id, question: text, state: "pending" },
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

  const busy = turns.some((turn) => turn.state === "pending");
  return { turns, busy, send, reset };
}
