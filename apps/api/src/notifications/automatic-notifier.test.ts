import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewsArticle } from "@bgs/shared-types";
import { beforeEach, describe, expect, it } from "vitest";
import { FileAuditJournal } from "../admin/audit-journal";
import { FileSettingStore } from "../admin/setting-store";
import { temporaryStore } from "../testing/store";
import { AUTOMATIC_SENDER, AutomaticNotifier } from "./automatic-notifier";
import { FileNotificationStore } from "./notification-store";
import type { PushProvider } from "./notifications";
import type { PushMessage } from "./push-message";

const MINUTE = 60_000;
const NOW = Date.parse("2026-09-30T08:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

const COVER: NewsArticle["images"][number] = {
  role: "cover",
  originalUrl: "https://www.presidence.sn/media/test.jpg",
  originalKey: "images/test/original.jpg",
  width: 1200,
  height: 800,
  alt: null,
  blurhash: "LEHV6nWB2yk8pyo0adR*",
  variants: [
    { format: "webp", width: 960, key: "images/test/960.webp", bytes: 900 },
    { format: "jpeg", width: 480, key: "images/test/480.jpeg", bytes: 500 },
    { format: "jpeg", width: 960, key: "images/test/960.jpeg", bytes: 1000 },
  ],
};

interface Shape {
  fetchedAt?: string;
  publishedOn?: string | null;
  cover?: boolean;
  hash?: string;
  withdrawn?: boolean;
}

function article(n: number, shape: Shape = {}): NewsArticle {
  const url = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    category: "communiques",
    sourceUrl: url,
    sourcePublishedOn: shape.publishedOn === undefined ? "2026-09-30" : shape.publishedOn,
    sourceUpdatedAt: null,
    fetchedAt: shape.fetchedAt ?? ago(1),
    contentHash: (shape.hash ?? String(n)).repeat(64).slice(0, 64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: `Titre officiel ${String(n)}`,
        bodyHtml: `<p>Premier paragraphe ${String(n)}.</p>`,
        sourceUrl: url,
        ...(shape.withdrawn === true ? { withdrawnAt: ago(0) } : {}),
      },
    ],
    audio: [],
    embedding: null,
    images: shape.cover === false ? [] : [COVER],
    attachments: [],
  };
}

let articles: ReturnType<typeof temporaryStore>;
let sent: PushMessage[];
let ready: boolean;
let shared: {
  store: FileNotificationStore;
  journal: FileAuditJournal;
  settings: FileSettingStore;
};

beforeEach(() => {
  articles = temporaryStore();
  sent = [];
  ready = true;
  const dir = join(tmpdir(), "bgs-automatic", randomUUID());
  shared = {
    store: new FileNotificationStore(join(dir, "notifications.json")),
    journal: new FileAuditJournal(join(dir, "audit.jsonl")),
    settings: new FileSettingStore(join(dir, "settings.json")),
  };
});

const push: PushProvider = {
  get ready() {
    return ready;
  },
  send: (message) => {
    sent.push(message);
    return Promise.resolve("sent");
  },
};

function notifier(perHour = 10, now = NOW) {
  return new AutomaticNotifier({
    ...shared,
    articles,
    push,
    mediaBaseUrl: "https://media.test",
    perHour,
    now: () => new Date(now),
  });
}

describe("the automatic notification of new articles (PUSH-03)", () => {
  it("announces a new article once, with its cover, whichever instance sees it", async () => {
    await articles.save(article(1));
    const [a, b] = await Promise.all([notifier().tick(), notifier().tick()]);
    expect([...a, ...b]).toEqual([article(1).id]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      imageUrl: "https://media.test/images/test/960.jpeg",
      versions: { fr: { title: "Titre officiel 1", excerpt: "Premier paragraphe 1." } },
    });
    expect(await notifier().tick()).toEqual([]);
    const [recorded] = await shared.store.all();
    expect(recorded).toMatchObject({
      origin: "automatic",
      status: "approved",
      preparedBy: AUTOMATIC_SENDER,
      delivery: { outcome: "sent" },
    });
    const actions = (await shared.journal.entries()).map((entry) => entry.action);
    expect(actions).toEqual(["notification.automatic.sent"]);
  });

  it("waits a little for the cover, then announces without it", async () => {
    await articles.save(article(1, { cover: false, fetchedAt: ago(1) }));
    expect(await notifier().tick()).toEqual([]);
    expect(await notifier(10, NOW + 3 * MINUTE).tick()).toEqual([article(1).id]);
    expect(sent[0]?.imageUrl).toBeNull();
  });

  it("never announces old news, a late collection, or a correction", async () => {
    await articles.save(article(1, { publishedOn: "2026-09-27" }));
    await articles.save(article(2, { fetchedAt: ago(40) }));
    await articles.save(article(3, { publishedOn: null }));
    await articles.save(article(4, { fetchedAt: ago(120) }));
    await articles.save(article(4, { fetchedAt: ago(1), hash: "c" }));
    expect(await notifier().tick()).toEqual([]);
  });

  it("announces nothing withdrawn by the source, nor without a push service", async () => {
    await articles.save(article(1, { withdrawn: true }));
    expect(await notifier().tick()).toEqual([]);
    await articles.save(article(2));
    ready = false;
    expect(await notifier().tick()).toEqual([]);
    expect(await shared.store.all()).toEqual([]);
  });

  it("stops while paused in the console, and says who paused it", async () => {
    const person = { id: "p", name: "Personne" };
    const paused = await notifier().setPaused(person, true);
    expect(paused).toMatchObject({ paused: true, changedBy: person, perHour: 10 });
    await articles.save(article(1));
    expect(await notifier().tick()).toEqual([]);
    await notifier().setPaused(person, false);
    expect(await notifier().tick()).toEqual([article(1).id]);
    const actions = (await shared.journal.entries()).map((entry) => entry.action);
    expect(actions.slice(0, 2)).toEqual([
      "notification.automatic.paused",
      "notification.automatic.resumed",
    ]);
  });

  it("sends at most the hourly maximum; the next are not announced later", async () => {
    for (const n of [1, 2, 3]) {
      await articles.save(article(n));
    }
    expect(await notifier(2).tick()).toHaveLength(2);
    expect(sent).toHaveLength(2);
    expect(await notifier(2, NOW + 61 * MINUTE).tick()).toEqual([]);
  });
});
