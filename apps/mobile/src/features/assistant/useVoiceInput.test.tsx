import type { Lang } from "@bgs/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import { TestProviders } from "../../testing/TestProviders";
import { useVoiceInput } from "./useVoiceInput";

const mockListen = jest.fn<Promise<string>, unknown[]>(() => Promise.resolve("started"));
jest.mock("./load-voice-input", () => ({
  voiceInputAvailable: () => true,
  loadVoiceInput: () => ({ listen: mockListen, stopListening: jest.fn() }),
}));

async function dictateIn(lang: Lang) {
  const { result } = await renderHook(() => useVoiceInput(lang, jest.fn()), {
    wrapper: TestProviders,
  });
  await act(async () => {
    await result.current.start();
  });
  return result;
}

describe("dictation", () => {
  beforeEach(() => {
    mockListen.mockClear();
  });

  it.each([
    ["fr", "fr-FR"],
    ["en", "en-US"],
  ] as const)("listens in the language chosen (%s → %s)", async (lang, locale) => {
    await dictateIn(lang);
    expect(mockListen).toHaveBeenCalledWith(expect.any(Object), locale);
  });

  it("says Wolof dictation is not there yet, without listening", async () => {
    const result = await dictateIn("wo");
    expect(mockListen).not.toHaveBeenCalled();
    expect(result.current.problem).toBe("wolof");
  });
});
