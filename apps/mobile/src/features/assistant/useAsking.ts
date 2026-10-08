import type { AssistantMode, AssistantReply, Lang } from "@bgs/shared-types";
import { useCallback, useRef, useState } from "react";
import { AskError, type AskFailure, createAssistantClient } from "../../api/assistant-client";
import { API_BASE_URL } from "../../api/base-url";

const client = createAssistantClient({ baseUrl: API_BASE_URL });

export type AskingState =
  | { phase: "idle" }
  | { phase: "asking"; mode: AssistantMode }
  | { phase: "replied"; mode: AssistantMode; reply: AssistantReply }
  | { phase: "failed"; failure: AskFailure };

/**
 * One question at a time: a new one replaces the previous reply, and a reply that
 * comes back after a newer question was asked is dropped.
 */
export function useAsking(ask = client.ask) {
  const [state, setState] = useState<AskingState>({ phase: "idle" });
  const latest = useRef(0);
  const submit = useCallback(
    async (question: string, mode: AssistantMode, lang: Lang) => {
      const turn = ++latest.current;
      setState({ phase: "asking", mode });
      try {
        const reply = await ask({ question: question.trim(), mode, lang });
        if (turn === latest.current) {
          setState({ phase: "replied", mode, reply });
        }
      } catch (error) {
        if (turn === latest.current) {
          setState({
            phase: "failed",
            failure: error instanceof AskError ? error.failure : "failed",
          });
        }
      }
    },
    [ask],
  );
  return { state, submit };
}
