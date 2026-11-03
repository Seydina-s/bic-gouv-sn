import type { AssistantReply } from "@bgs/shared-types";
import { flagOf, type ChatTurn } from "./useConversation";

// Placeholder texts, not real content.
const reply = (status: AssistantReply["status"]): ChatTurn => ({
  id: 1,
  question: "Laaj bu fictif ?",
  lang: "wo",
  state: "replied",
  reply: { status, text: null, sources: [], resumesOn: null },
});

describe("what « Signaler cette réponse » sends (AST-30e)", () => {
  it("sends the question in its own language, the answer and its sources", () => {
    expect(flagOf(reply("not_found"))).toEqual({
      question: "Laaj bu fictif ?",
      lang: "wo",
      mode: "ask",
      status: "not_found",
      answer: null,
      sources: [],
    });
  });

  it("has nothing to send for a pause, an error, a courtesy reply or a pending question", () => {
    expect(flagOf(reply("paused"))).toBeNull();
    expect(flagOf(reply("unavailable"))).toBeNull();
    const base = { id: 2, question: "Bonjour", lang: "fr" } as const;
    expect(flagOf({ ...base, state: "courtesy", kind: "greeting" })).toBeNull();
    expect(flagOf({ ...base, state: "failed", failure: "offline" })).toBeNull();
    expect(flagOf({ ...base, state: "pending" })).toBeNull();
  });
});
