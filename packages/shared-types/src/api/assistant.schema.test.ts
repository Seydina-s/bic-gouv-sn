import { describe, expect, it } from "vitest";
import {
  ASSISTANT_QUESTION_MAX,
  assistantLimitChangeSchema,
  assistantQuestionSchema,
  assistantReplySchema,
  readAssistantReply,
} from "./assistant.schema";

describe("assistant schemas", () => {
  it("takes a question in one of the app's languages, asked or to check, within its length", () => {
    expect(
      assistantQuestionSchema.parse({ question: "  Quand a lieu le Conseil ?  ", lang: "fr" }),
    ).toEqual({ question: "Quand a lieu le Conseil ?", lang: "fr", mode: "ask" });
    expect(
      assistantQuestionSchema.safeParse({
        question: "Le Conseil est-il annulé ?",
        lang: "fr",
        mode: "verify",
      }).success,
    ).toBe(true);
    expect(assistantQuestionSchema.safeParse({ question: "ok", lang: "fr" }).success).toBe(false);
    expect(
      assistantQuestionSchema.safeParse({
        question: "x".repeat(ASSISTANT_QUESTION_MAX + 1),
        lang: "fr",
      }).success,
    ).toBe(false);
    expect(
      assistantQuestionSchema.safeParse({ question: "Une question", lang: "pt" }).success,
    ).toBe(false);
    expect(
      assistantQuestionSchema.safeParse({ question: "Une question", lang: "fr", extra: 1 }).success,
    ).toBe(false);
  });

  it("describes an answer with its official sources, or why there is none", () => {
    const answered = {
      status: "answered",
      text: "Le Conseil s'est tenu mercredi.",
      sources: [
        {
          kind: "news-article",
          contentId: "00000000-0000-5000-8000-000000000001",
          slug: null,
          title: "Communiqué du Conseil des ministres",
          url: "https://www.presidence.sn/fr/actualites/test/",
          publishedOn: "2026-10-01",
        },
      ],
      resumesOn: null,
    };
    expect(assistantReplySchema.safeParse(answered).success).toBe(true);
    const paused = { status: "paused", text: null, sources: [], resumesOn: "2026-11-01" };
    expect(assistantReplySchema.safeParse(paused).success).toBe(true);
  });

  it("accepts a sensible monthly limit only", () => {
    expect(assistantLimitChangeSchema.safeParse({ monthlyLimit: 10_000 }).success).toBe(true);
    expect(assistantLimitChangeSchema.safeParse({ monthlyLimit: 0 }).success).toBe(false);
    expect(assistantLimitChangeSchema.safeParse({ monthlyLimit: 2.5 }).success).toBe(false);
  });
});

describe("readAssistantReply (a newer API talking to an older app)", () => {
  // Placeholder sources, not real content.
  const article = {
    kind: "news-article",
    contentId: "a1",
    slug: null,
    title: "Titre fictif",
    url: "https://www.presidence.sn/fr/actualites/test/",
    publishedOn: "2026-10-13",
  };
  const office = {
    kind: "service",
    contentId: "osm-n1",
    slug: null,
    title: "Mairie fictive",
    url: "https://www.openstreetmap.org/node/1",
    publishedOn: "2026-10-15",
  };
  const answered = (sources: unknown[]) => ({
    status: "answered",
    text: "Réponse fictive.",
    sources,
    resumesOn: null,
  });

  it("reads a government service among the sources", () => {
    expect(readAssistantReply(answered([article, office]))?.sources).toHaveLength(2);
  });

  it("drops a source of a kind added later, and keeps the answer", () => {
    const later = { ...article, kind: "video", contentId: "v1" };
    expect(readAssistantReply(answered([article, later]))?.sources).toEqual([article]);
  });

  it("refuses an answer left without any source it can show", () => {
    const later = { ...article, kind: "video" };
    expect(readAssistantReply(answered([later]))).toBeNull();
    expect(readAssistantReply(null)).toBeNull();
    expect(
      readAssistantReply({ status: "not_found", text: null, sources: [], resumesOn: null }),
    ).toMatchObject({ status: "not_found" });
  });
});
