import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  apiErrorSchema,
  notificationSchema,
  notificationsResponseSchema,
  type NewsArticle,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import type { PushProvider } from "../notifications/notifications";
import type { PushMessage } from "../notifications/push-message";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder text, not real content.
const sourceUrl = "https://www.presidence.sn/fr/actualites/test-1/";
const article: NewsArticle = {
  id: "00000000-0000-5000-8000-000000000001",
  kind: "news-article",
  category: "conseil-des-ministres",
  sourceUrl,
  sourcePublishedOn: "2026-09-28",
  sourceUpdatedAt: null,
  fetchedAt: "2026-09-28T10:00:00Z",
  contentHash: "1".repeat(64),
  version: 1,
  lang: "fr",
  translations: [
    {
      lang: "fr",
      status: "official",
      title: "Titre officiel",
      bodyHtml: "<p>Corps</p>",
      sourceUrl,
    },
  ],
  audio: [],
  embedding: null,
  images: [],
  attachments: [],
};

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;
let sent: PushMessage[];

async function start(pushProvider?: PushProvider) {
  const articles = temporaryStore();
  await articles.save(article);
  app = await buildApp({
    config: loadConfig({
      LOG_LEVEL: "silent",
      NOTIFICATIONS_PATH: join(dir, "notifications.json"),
      SETTINGS_PATH: join(dir, "settings.json"),
    }),
    version: "1.0.0",
    articles,
    admin: admin.admin,
    ...(pushProvider === undefined ? {} : { pushProvider }),
  });
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-notifications-"));
  admin = await adminForTests();
  sent = [];
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const call = (token: string, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
  app.inject({
    method,
    url: `/admin/v1${url}`,
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload }),
  });

async function prepare(token: string) {
  const response = await call(token, "POST", "/notifications", {
    articleId: article.id,
    lang: "fr",
  });
  expect(response.statusCode).toBe(201);
  return notificationSchema.parse(response.json());
}

describe("notifications, two people", () => {
  it("announces an official article with its own title; the author cannot approve it", async () => {
    await start();
    const author = await admin.tokenFor("editor");
    const prepared = await prepare(author);
    expect(prepared).toMatchObject({
      title: "Titre officiel",
      category: "conseil-des-ministres",
      status: "pending",
      preparedBy: { name: "editor" },
    });
    expect(prepared.preparedBy).not.toHaveProperty("email");
    const self = await call(author, "POST", `/notifications/${prepared.id}/approve`);
    expect(self.statusCode).toBe(403);
    expect(apiErrorSchema.parse(self.json()).code).toBe("NOTIFICATION_SAME_PERSON");
  });

  it("is sent once a second person approves, and journaled at each step", async () => {
    await start({
      ready: true,
      send: (message) => {
        sent.push(message);
        return Promise.resolve({ outcome: "sent" as const, recipients: 1 });
      },
    });
    const prepared = await prepare(await admin.tokenFor("editor"));
    const second = await admin.tokenFor("editor");
    const approved = notificationSchema.parse(
      (await call(second, "POST", `/notifications/${prepared.id}/approve`)).json(),
    );
    expect(approved).toMatchObject({
      status: "approved",
      delivery: { outcome: "sent", recipients: 1 },
    });
    expect(sent.map((item) => item.articleId)).toEqual([prepared.articleId]);
    const again = await call(second, "POST", `/notifications/${prepared.id}/cancel`);
    expect(apiErrorSchema.parse(again.json()).code).toBe("NOTIFICATION_NOT_PENDING");
    const actions = (await admin.journal.entries()).map((entry) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining(["notification.prepared", "notification.approved"]),
    );
  });

  it("prepares a notification sent twice with the same key only once", async () => {
    await start();
    const token = await admin.tokenFor("editor");
    const twice = () =>
      app.inject({
        method: "POST",
        url: "/admin/v1/notifications",
        headers: { authorization: `Bearer ${token}`, "idempotency-key": "cle-du-formulaire-0001" },
        payload: { articleId: article.id, lang: "fr" },
      });
    const first = await twice();
    const second = await twice();
    expect(second.statusCode).toBe(201);
    expect(notificationSchema.parse(second.json()).id).toBe(
      notificationSchema.parse(first.json()).id,
    );
    const list = notificationsResponseSchema.parse(
      (await call(token, "GET", "/notifications")).json(),
    );
    expect(list.notifications).toHaveLength(1);
  });

  it("refuses a second notification for an article already waiting, even by someone else", async () => {
    await start();
    const first = await prepare(await admin.tokenFor("editor"));
    const other = await call(await admin.tokenFor("editor"), "POST", "/notifications", {
      articleId: article.id,
      lang: "fr",
    });
    expect(other.statusCode).toBe(409);
    expect(apiErrorSchema.parse(other.json()).code).toBe("NOTIFICATION_ALREADY_PENDING");
    // Once decided, the article can be announced again (a reminder is not refused).
    const author = await admin.tokenFor("editor");
    await call(author, "POST", `/notifications/${first.id}/cancel`);
    expect(
      (await call(author, "POST", "/notifications", { articleId: article.id, lang: "fr" }))
        .statusCode,
    ).toBe(201);
  });

  it("records a failed sending instead of leaving an approval without result", async () => {
    await start({ ready: true, send: () => Promise.reject(new Error("push service down")) });
    const prepared = await prepare(await admin.tokenFor("editor"));
    const approved = await call(
      await admin.tokenFor("editor"),
      "POST",
      `/notifications/${prepared.id}/approve`,
    );
    expect(notificationSchema.parse(approved.json())).toMatchObject({
      status: "approved",
      delivery: { outcome: "failed" },
    });
  });

  it("says nothing was sent while no push service is set up", async () => {
    await start();
    const prepared = await prepare(await admin.tokenFor("editor"));
    const reader = await admin.tokenFor("reviewer");
    const approved = await call(
      await admin.tokenFor("admin"),
      "POST",
      `/notifications/${prepared.id}/approve`,
    );
    expect(notificationSchema.parse(approved.json()).delivery?.outcome).toBe("not-sent");
    const list = notificationsResponseSchema.parse(
      (await call(reader, "GET", "/notifications")).json(),
    );
    expect(list).toMatchObject({ canSend: false, notifications: [{ status: "approved" }] });
  });

  it("refuses an unknown article, and a reviewer cannot prepare", async () => {
    await start();
    const editor = await admin.tokenFor("editor");
    const unknown = await call(editor, "POST", "/notifications", {
      articleId: "00000000-0000-5000-8000-000000000009",
      lang: "fr",
    });
    expect(apiErrorSchema.parse(unknown.json()).code).toBe("NOTIFICATION_ARTICLE_UNKNOWN");
    const reviewer = await admin.tokenFor("reviewer");
    const refused = await call(reviewer, "POST", "/notifications", {
      articleId: article.id,
      lang: "fr",
    });
    expect(refused.statusCode).toBe(403);
  });

  it("lets its author cancel it before anyone decides", async () => {
    await start();
    const author = await admin.tokenFor("editor");
    const prepared = await prepare(author);
    const cancelled = await call(author, "POST", `/notifications/${prepared.id}/cancel`);
    expect(notificationSchema.parse(cancelled.json()).status).toBe("cancelled");
  });

  it("lets any editor pause the automatic notifications, only an administrator resume", async () => {
    await start();
    const editor = await admin.tokenFor("editor");
    const listed = notificationsResponseSchema.parse(
      (await call(editor, "GET", "/notifications")).json(),
    );
    expect(listed.automatic).toMatchObject({ paused: false, perHour: 10, changedBy: null });
    const paused = await call(editor, "PUT", "/notifications/automatic", { paused: true });
    expect(paused.statusCode).toBe(200);
    expect(paused.json()).toMatchObject({ paused: true, changedBy: { name: "editor" } });
    const resumedByEditor = await call(editor, "PUT", "/notifications/automatic", {
      paused: false,
    });
    expect(resumedByEditor.statusCode).toBe(403);
    const boss = await admin.tokenFor("admin");
    const resumed = await call(boss, "PUT", "/notifications/automatic", { paused: false });
    expect(resumed.json()).toMatchObject({ paused: false, changedBy: { name: "admin" } });
    const reviewer = await admin.tokenFor("reviewer");
    const refused = await call(reviewer, "PUT", "/notifications/automatic", { paused: true });
    expect(refused.statusCode).toBe(403);
  });
});
