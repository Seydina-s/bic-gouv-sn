import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

/**
 * Dictation of a question (French), by the phone's own speech recognition. Only
 * required through load-voice-input.ts: builds made before it was added do not have
 * its native module. Recognition stays on the phone when the phone can do it; the
 * app never keeps the voice.
 */

export type ListenOutcome = "started" | "denied" | "unavailable";

export interface ListenHandlers {
  /** The words heard so far (`final`: the phrase is complete). */
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError: (code: string) => void;
}

let subscriptions: { remove: () => void }[] = [];

function release(): void {
  for (const subscription of subscriptions) {
    subscription.remove();
  }
  subscriptions = [];
}

export async function listen(handlers: ListenHandlers): Promise<ListenOutcome> {
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    return "denied";
  }
  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
    return "unavailable";
  }
  release();
  subscriptions = [
    ExpoSpeechRecognitionModule.addListener("result", (event) => {
      handlers.onText(event.results[0]?.transcript ?? "", event.isFinal);
    }),
    ExpoSpeechRecognitionModule.addListener("end", () => {
      release();
      handlers.onEnd();
    }),
    ExpoSpeechRecognitionModule.addListener("error", (event) => {
      release();
      handlers.onError(event.error);
    }),
  ];
  ExpoSpeechRecognitionModule.start({
    lang: "fr-FR",
    interimResults: true,
    addsPunctuation: true,
    continuous: false,
    requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  });
  return "started";
}

/** Ends the dictation; the last words heard still arrive. */
export function stopListening(): void {
  ExpoSpeechRecognitionModule.stop();
}
