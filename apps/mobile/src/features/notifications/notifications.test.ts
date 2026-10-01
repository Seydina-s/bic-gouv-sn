import { createPushClient } from "../../api/push-client";
import {
  isInvitationDue,
  QUIET_HOURS,
  subscriptionFor,
  toggleTopic,
  topicsFromText,
  topicsToText,
} from "./notification-preferences";
import { articleIdOf, articleIdOfResponse } from "./useNotificationTaps";

const TOKEN = "ExponentPushToken[abcdefghij0123456789]";

describe("notification preferences", () => {
  it("follow every section, with nothing at night unless the person wants it", () => {
    expect(subscriptionFor(TOKEN, "on", "wo")).toEqual({
      token: TOKEN,
      topics: null,
      quietHours: QUIET_HOURS,
      lang: "wo",
    });
    expect(subscriptionFor(TOKEN, "off", "fr").quietHours).toBeNull();
  });

  it("invite once, after a first article read, where notifications can arrive", () => {
    const facts = { supported: true, invited: false, choice: "off" as const };
    expect(isInvitationDue(facts)).toBe(true);
    expect(isInvitationDue({ ...facts, invited: true })).toBe(false);
    expect(isInvitationDue({ ...facts, choice: "on" })).toBe(false);
    expect(isInvitationDue({ ...facts, supported: false })).toBe(false);
  });

  it("open only a well-formed article from a notification", () => {
    const id = "00000000-0000-5000-8000-000000000001";
    expect(articleIdOf({ articleId: id })).toBe(id);
    expect(articleIdOf({ articleId: "../../settings" })).toBeNull();
    expect(articleIdOf(null)).toBeNull();
    const touched = { notification: { request: { content: { data: { articleId: id } } } } };
    expect(articleIdOfResponse(touched)).toBe(id);
    expect(articleIdOfResponse({})).toBeNull();
    expect(articleIdOfResponse(undefined)).toBeNull();
  });
});

describe("the push subscription client", () => {
  it("puts the subscription, and deletes it with the token only", async () => {
    const calls: { url: string; method: string | undefined; body: unknown }[] = [];
    const fetchImpl = ((url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method,
        body: JSON.parse(typeof init?.body === "string" ? init.body : "null"),
      });
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as typeof fetch;
    const client = createPushClient({ baseUrl: "https://api.test", fetchImpl });
    await client.subscribe(subscriptionFor(TOKEN, "on", "fr"));
    await client.unsubscribe(TOKEN);
    expect(calls).toEqual([
      {
        url: "https://api.test/v1/push/subscription",
        method: "PUT",
        body: subscriptionFor(TOKEN, "on", "fr"),
      },
      { url: "https://api.test/v1/push/subscription", method: "DELETE", body: { token: TOKEN } },
    ]);
  });

  it("fails on a refusal, so the next opening tries again", async () => {
    const fetchImpl = (() => Promise.resolve(new Response(null, { status: 400 }))) as typeof fetch;
    const client = createPushClient({ baseUrl: "https://api.test", fetchImpl });
    await expect(client.unsubscribe(TOKEN)).rejects.toThrow(/HTTP 400/);
  });
});

describe("the sections a phone follows", () => {
  it("start from every section, then keep the ones touched", () => {
    expect(toggleTopic(null, "discours")).toEqual(["discours"]);
    expect(toggleTopic(["discours"], "communiques")).toEqual(["discours", "communiques"]);
    expect(toggleTopic(["discours", "communiques"], "discours")).toEqual(["communiques"]);
    expect(toggleTopic(["discours"], null)).toBeNull();
  });

  it("never stop by mistake: removing the last one means every section again", () => {
    expect(toggleTopic(["discours"], "discours")).toBeNull();
  });

  it("are remembered as text, unknown sections left aside", () => {
    const known = ["discours", "communiques"];
    expect(topicsFromText(topicsToText(["discours"]), known)).toEqual(["discours"]);
    expect(topicsFromText(topicsToText(null), known)).toBeNull();
    expect(topicsFromText("disparue,discours", known)).toEqual(["discours"]);
    expect(topicsFromText("disparue", known)).toBeNull();
    expect(topicsFromText(null, known)).toBeNull();
    expect(subscriptionFor(TOKEN, "on", "fr", ["discours"]).topics).toEqual(["discours"]);
  });
});
