import { useCallback, useState } from "react";
import { SendError, type SendFailure } from "../../api/participation-client";

export type SendingState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent" }
  | { phase: "failed"; failure: SendFailure };

/** A key for one draft: the same draft sent twice is kept once by the API. */
export function draftKey(): string {
  const random = () => Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random()}${random()}`;
}

/**
 * Sending one draft: the key stays the same through retries, and a new one is
 * drawn once the draft has gone (the next message is another one).
 */
export function useSending(send: (key: string) => Promise<void>) {
  const [state, setState] = useState<SendingState>({ phase: "idle" });
  const [key, setKey] = useState(draftKey);
  const submit = useCallback(async (): Promise<boolean> => {
    setState({ phase: "sending" });
    try {
      await send(key);
      setState({ phase: "sent" });
      setKey(draftKey());
      return true;
    } catch (error) {
      setState({
        phase: "failed",
        failure: error instanceof SendError ? error.failure : "failed",
      });
      return false;
    }
  }, [send, key]);
  /** Back to writing (the confirmation or the error goes once the person types again). */
  const reset = useCallback(() => {
    setState((current) => (current.phase === "sending" ? current : { phase: "idle" }));
  }, []);
  return { state, submit, reset };
}
