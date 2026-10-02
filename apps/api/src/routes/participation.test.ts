import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { participationResponseSchema, submissionReceiptSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileRemoteConfigStore } from "@bgs/content-store";
import { writeFile } from "node:fs/promises";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import {
  FileParticipationStore,
  ParticipationService,
  PhotoFolder,
} from "../participation/participation";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-participation-"));
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({
      LOG_LEVEL: "silent",
      PARTICIPATION_PHOTOS_ROOT: join(dir, "photos"),
    }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
    participationStore: new FileParticipationStore(join(dir, "participation.json")),
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

/** A small JPEG carrying hidden data, as a phone's photo would. */
async function photoWithHiddenData(): Promise<string> {
  const jpeg = await sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 0, g: 133, b: 63 } },
  })
    .withExif({ IFD0: { Copyright: "Appareil fictif" } })
    .jpeg()
    .toBuffer();
  expect((await sharp(jpeg).metadata()).exif).toBeDefined();
  return jpeg.toString("base64");
}

const send = (url: string, payload: object) =>
  app.inject({ method: "POST", url: `/v1/participation/${url}`, payload });

async function consoleList(): Promise<ReturnType<typeof participationResponseSchema.parse>> {
  const response = await app.inject({
    method: "GET",
    url: "/admin/v1/participation",
    headers: { authorization: `Bearer ${await admin.tokenFor("reviewer")}` },
  });
  return participationResponseSchema.parse(response.json());
}

describe("Participer", () => {
  it("receives a message to the government, read in the console", async () => {
    const sent = await send("messages", {
      topic: "gouvernement",
      text: "Un message fictif pour les tests.",
      lang: "fr",
    });
    expect(sent.statusCode).toBe(201);
    const { id } = submissionReceiptSchema.parse(sent.json());
    expect((await consoleList()).entries).toMatchObject([
      { id, type: "message", topic: "gouvernement", status: "new" },
    ]);
  });

  it("keeps the kind of problem said for the other ones, and asks for it", async () => {
    const report = {
      category: "autre",
      text: "Un signalement fictif pour les tests.",
      place: null,
      photo: null,
      lang: "fr",
    };
    const sent = await send("reports", { ...report, detail: "Feu tricolore en panne" });
    expect(sent.statusCode).toBe(201);
    expect((await consoleList()).entries).toMatchObject([
      { type: "report", category: "autre", detail: "Feu tricolore en panne" },
    ]);
    expect((await send("reports", { ...report, detail: null })).statusCode).toBe(400);
  });

  it("keeps a report's photo without its hidden data, for the console only", async () => {
    const sent = await send("reports", {
      category: "voirie",
      detail: null,
      text: "Un signalement fictif pour les tests.",
      place: "Quartier fictif",
      photo: await photoWithHiddenData(),
      lang: "fr",
    });
    expect(sent.statusCode).toBe(201);
    const [entry] = (await consoleList()).entries;
    expect(entry).toMatchObject({ type: "report", category: "voirie", place: "Quartier fictif" });
    const photoId = entry?.type === "report" ? entry.photoId : null;
    expect(photoId).not.toBeNull();
    const url = `/admin/v1/participation/photos/${String(photoId)}`;
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
    const photo = await app.inject({
      method: "GET",
      url,
      headers: { authorization: `Bearer ${await admin.tokenFor("reviewer")}` },
    });
    expect(photo.headers["content-type"]).toBe("image/jpeg");
    expect((await sharp(photo.rawPayload).metadata()).exif).toBeUndefined();
  });

  it("refuses what is not a picture, and floods from one address", async () => {
    const report = {
      category: "eau",
      detail: null,
      text: "Un signalement fictif.",
      place: null,
      lang: "fr",
    };
    const broken = await send("reports", { ...report, photo: "bm90IGFuIGltYWdl" });
    expect(broken.statusCode).toBe(422);
    expect(broken.json<{ code: string }>().code).toBe("PARTICIPATION_PHOTO_INVALID");
    const message = { topic: "autre", text: "Un message fictif répété.", lang: "fr" };
    const answers = [];
    for (let i = 0; i < 6; i += 1) {
      answers.push((await send("messages", message)).statusCode);
    }
    expect(answers.at(-1)).toBe(429);
  });

  it("is marked as handled by an editor, in the audit journal", async () => {
    await send("messages", { topic: "application", text: "Un avis fictif sur l'app.", lang: "fr" });
    const [entry] = (await consoleList()).entries;
    const url = `/admin/v1/participation/${String(entry?.id)}/handled`;
    const as = async (role: "reviewer" | "editor") =>
      app.inject({
        method: "POST",
        url,
        headers: { authorization: `Bearer ${await admin.tokenFor(role)}` },
      });
    expect((await as("reviewer")).statusCode).toBe(403);
    expect((await as("editor")).statusCode).toBe(200);
    expect((await consoleList()).entries[0]).toMatchObject({ status: "handled" });
    const audit = await admin.admin.journal.entries();
    expect(audit.some((line) => line.action === "participation.handled")).toBe(true);
  });
});

describe("Participer switched off in the console", () => {
  it("refuses what is sent, as the apps hide the tab", async () => {
    const path = join(dir, "remote-config.json");
    await writeFile(path, JSON.stringify({ minVersion: null, features: { participate: false } }));
    const closed = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent" }),
      version: "1.0.0",
      articles: temporaryStore(),
      admin: admin.admin,
      remoteConfig: new FileRemoteConfigStore(path),
      participationStore: new FileParticipationStore(join(dir, "closed.json")),
    });
    const sent = await closed.inject({
      method: "POST",
      url: "/v1/participation/messages",
      payload: { topic: "autre", text: "Un message fictif refusé.", lang: "fr" },
    });
    expect(sent.statusCode).toBe(503);
    expect(sent.json<{ code: string }>().code).toBe("PARTICIPATION_CLOSED");
    await closed.close();
  });
});

describe("Participer's keeping time", () => {
  it("erases what is over a year old, photos included", async () => {
    let today = new Date("2026-10-01T10:00:00Z");
    const photos = new PhotoFolder(join(dir, "kept-photos"));
    const service = new ParticipationService(
      new FileParticipationStore(join(dir, "kept.json")),
      photos,
      null,
      () => today,
    );
    const old = await service.receiveReport({
      category: "salubrite",
      detail: null,
      text: "Un vieux signalement fictif.",
      place: null,
      photo: await photoWithHiddenData(),
      lang: "fr",
    });
    const oldPhoto = old.type === "report" ? old.photoId : null;
    expect(await photos.read(String(oldPhoto))).not.toBeNull();
    today = new Date("2027-10-02T10:00:00Z");
    await service.receiveMessage({ topic: "autre", text: "Un message fictif récent.", lang: "fr" });
    expect((await service.list()).map((entry) => entry.type)).toEqual(["message"]);
    expect(await photos.read(String(oldPhoto))).toBeNull();
  });
});
