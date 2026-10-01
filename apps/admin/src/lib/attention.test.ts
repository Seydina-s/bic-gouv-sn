import type { ErrorJournalEntry, notificationsResponseSchema } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { attentionItems, BURST_FROM } from "./attention";

const NOW = new Date("2026-10-01T09:00:00Z");

function error(code: string, lastAt: string, resolvedAt?: string): ErrorJournalEntry {
  return {
    code,
    where: "GET /v1/news",
    count: 1,
    firstAt: lastAt,
    lastAt,
    lastRequestId: null,
    ...(resolvedAt === undefined ? {} : { resolved: { at: resolvedAt, by: "Personne fictive" } }),
  };
}

type Notifications = z.infer<typeof notificationsResponseSchema>;

const quiet: Notifications = {
  notifications: [],
  canSend: true,
  automatic: { paused: false, perHour: 10, changedBy: null, changedAt: null, recentSendings: 0 },
  subscribers: {
    total: 0,
    everySection: 0,
    quietHours: 0,
    french: 0,
    wolof: 0,
    newLastDay: 0,
    newWeekBefore: 0,
  },
};

describe("attentionItems", () => {
  it("has nothing to say when all is calm", () => {
    expect(attentionItems({ errors: [], notifications: quiet, now: NOW })).toEqual([]);
  });

  it("counts the errors still happening, not the past nor the fixed ones, blocking first", () => {
    const items = attentionItems({
      errors: [
        error("INTERNAL_ERROR", "2026-10-01T08:58:00Z"),
        error("ROUTE_NOT_FOUND", "2026-10-01T08:59:00Z"),
        error("INTERNAL_ERROR", "2026-09-30T08:00:00Z"),
        { ...error("RATE_LIMITED", "2026-10-01T08:57:00Z", "2026-10-01T08:58:00Z") },
      ],
      notifications: { ...quiet, automatic: { ...quiet.automatic, paused: true } },
      now: NOW,
    });
    expect(items.map((item) => [item.tone, item.href])).toEqual([
      ["danger", "/erreurs"],
      ["warning", "/notifications"],
    ]);
    expect(items[0]?.text).toMatch(/2 erreurs en cours, dont 1 bloquante/);
  });

  it("raises the notification alerts, then what waits for a second person", () => {
    const pending = {
      id: "00000000-0000-4000-8000-000000000001",
      articleId: "00000000-0000-5000-8000-000000000001",
      lang: "fr" as const,
      title: "Article fictif",
      category: "communiques",
      preparedBy: { id: "a", name: "Personne fictive" },
      preparedAt: "2026-10-01T08:00:00Z",
      status: "pending" as const,
      decidedBy: null,
      decidedAt: null,
      delivery: null,
    };
    const items = attentionItems({
      errors: [],
      notifications: {
        ...quiet,
        notifications: [pending] as Notifications["notifications"],
        automatic: { ...quiet.automatic, recentSendings: BURST_FROM },
        subscribers: { ...quiet.subscribers, newLastDay: 900 },
      },
      now: NOW,
    });
    expect(items.map((item) => item.tone)).toEqual(["danger", "danger", "warning"]);
    expect(items[2]?.text).toMatch(/1 notification attend/);
  });

  it("counts what citizens sent and what opportunities wait, when there is some", () => {
    const items = attentionItems({
      errors: [],
      notifications: quiet,
      now: NOW,
      participationToRead: 2,
      opportunitiesPending: 0,
    });
    expect(items).toEqual([
      {
        tone: "warning",
        text: "2 messages ou signalements des citoyens à lire.",
        href: "/participation",
      },
    ]);
  });

  it("says when it could not read a source, rather than passing for calm", () => {
    const items = attentionItems({ errors: null, notifications: quiet, now: NOW });
    expect(items).toEqual([expect.objectContaining({ tone: "warning", href: "/" })]);
  });
});
