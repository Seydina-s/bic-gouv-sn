import { requireOptionalNativeModule } from "expo";
import type * as VoiceInput from "./voice-input";

/** Dictation works where the speech module exists: builds made since it was added. */
export function voiceInputAvailable(): boolean {
  return requireOptionalNativeModule("ExpoSpeechRecognition") !== null;
}

export function loadVoiceInput(): typeof VoiceInput {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- older builds lack the module
  return require("./voice-input") as typeof VoiceInput;
}
