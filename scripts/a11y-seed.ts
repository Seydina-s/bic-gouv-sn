// Placeholder data for the accessibility audit (QA-06, QA-07): written to a
// throwaway folder, never published, deleted after the run.
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { base32Decode, codeAt, hashPassword, timeStep } from "../packages/admin-auth/src/index";
import {
  FileArticleRepository,
  FileProcedureRepository,
  FileStateServiceStore,
} from "../packages/content-store/src/index";
import { procedureSchema } from "../packages/shared-types/src/index";
import { procedure } from "../packages/shared-types/src/testing/fixtures";

const repo = fileURLToPath(new URL("..", import.meta.url));
export const ARTICLE_ID = "00000000-0000-5000-8000-00000000a11e";
export const PROCEDURE_SLUG = "test-demarche";
export const SERVICE_ID = "osm-n1";
const ACCOUNT_EMAIL = "audit-accessibilite@bic.test";
const PDF = Buffer.from("%PDF-1.7\n% document fictif\n");
const PDF_HASH = "b".repeat(64);

type SharpFactory = (options: {
  create: { width: number; height: number; channels: 3; background: string };
}) => { jpeg: () => { toBuffer: () => Promise<Buffer> } };

const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 270;
const INLINE_PHOTO = "https://bo-admin.presidence.sn/storage/image/audit-accessibilite.jpg";

/** A plain placeholder photo (one colour), stored like the ingestion stores photos. */
async function seedPhoto(dataDir: string, role: "cover" | "inline", originalUrl: string) {
  // The image library of the ingestion (not a dependency of the root scripts).
  const sharp = createRequire(join(repo, "services", "ingestion", "package.json"))(
    "sharp",
  ) as SharpFactory;
  const jpeg = await sharp({
    create: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 3, background: "#5a7d6a" },
  })
    .jpeg()
    .toBuffer();
  const folder = `images/audit-${role}`;
  mkdirSync(join(dataDir, "media", folder), { recursive: true });
  writeFileSync(join(dataDir, "media", folder, "original.jpg"), jpeg);
  writeFileSync(join(dataDir, "media", folder, `${String(PHOTO_WIDTH)}.jpg`), jpeg);
  return {
    role,
    originalUrl,
    originalKey: `${folder}/original.jpg`,
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    alt: role === "inline" ? "Photo fictive dans le texte" : null,
    blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    variants: [
      {
        format: "jpeg" as const,
        width: PHOTO_WIDTH,
        key: `${folder}/${String(PHOTO_WIDTH)}.jpg`,
        bytes: jpeg.length,
      },
    ],
  };
}

async function seedArticle(dataDir: string): Promise<void> {
  const sourceUrl = "https://www.presidence.sn/fr/actualites/audit-accessibilite/";
  const key = `documents/${PDF_HASH}.pdf`;
  mkdirSync(join(dataDir, "media", "documents"), { recursive: true });
  writeFileSync(join(dataDir, "media", key), PDF);
  const images = [
    await seedPhoto(
      dataDir,
      "cover",
      "https://bo-admin.presidence.sn/storage/image/couverture.jpg",
    ),
    await seedPhoto(dataDir, "inline", INLINE_PHOTO),
  ];
  const document = (title: string | null, name: string) => ({
    sourceUrl: `https://bo-admin.presidence.sn/storage/documents/${name}.pdf`,
    key,
    title,
    mimeType: "application/pdf" as const,
    bytes: PDF.length,
    contentHash: PDF_HASH,
  });
  await new FileArticleRepository(join(dataDir, "news.json")).save({
    id: ARTICLE_ID,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-28",
    sourceUpdatedAt: "2026-09-28T08:00:00Z",
    fetchedAt: "2026-09-28T08:01:00Z",
    contentHash: "a".repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: "Article fictif pour l'audit d'accessibilité",
        bodyHtml:
          '<p>Texte fictif, avec un <a href="https://www.presidence.sn/fr/">lien</a>.</p>' +
          "<h2>Intertitre</h2><ul><li>Premier point</li><li>Second point</li></ul>" +
          "<blockquote><p>Citation fictive.</p></blockquote>" +
          `<p><img src="${INLINE_PHOTO}" alt="Photo fictive dans le texte" /></p>`,
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    images,
    attachments: [document("Document fictif", "fictif"), document(null, "sans-titre")],
  });
  await seedWithdrawnArticle(join(dataDir, "news.json"));
}

/** An article the source withdrew: hidden in the app, listed in the console. */
async function seedWithdrawnArticle(storePath: string): Promise<void> {
  const repository = new FileArticleRepository(storePath);
  const sourceUrl = "https://www.presidence.sn/fr/actualites/article-retire-fictif/";
  const id = "00000000-0000-5000-8000-00000000a12e";
  await repository.save({
    id,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-27",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-27T08:01:00Z",
    contentHash: "c".repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: "Article fictif retiré par la source",
        bodyHtml: "<p>Texte fictif.</p>",
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  });
  await repository.setWithdrawn(id, "fr", "2026-09-28T02:00:00Z");
}

async function seedProcedure(dataDir: string): Promise<void> {
  const placeholder = procedureSchema.parse(
    procedure({
      eligibility: "Toute personne (texte fictif).",
      faqs: [{ question: "Question fictive ?", answerHtml: "<p>Réponse fictive.</p>" }],
    }),
  );
  await new FileProcedureRepository(join(dataDir, "procedures.json")).save(placeholder);
}

async function seedServices(dataDir: string): Promise<void> {
  const location = { lat: 14.7, lng: -17.4 };
  await new FileStateServiceStore(join(dataDir, "state-services.json")).importServices(
    [
      {
        id: SERVICE_ID,
        category: "mairie",
        name: "Mairie fictive",
        address: "Adresse fictive",
        town: "Ville fictive",
        location,
        phone: "+221 33 000 00 00",
        website: null,
        openingHours: "Mo-Fr 08:00-17:00",
        origin: { kind: "osm", osmType: "node", osmId: 1, fetchedAt: "2026-09-28T08:00:00Z" },
      },
    ],
    [{ id: "osm-n9", name: "Ville fictive", kind: "city", location }],
  );
}

/** A console account known only to this run; the password never leaves memory. */
async function seedAccount(dataDir: string, password: string): Promise<void> {
  const account = {
    id: randomUUID(),
    email: ACCOUNT_EMAIL,
    name: "Audit d'accessibilité",
    role: "admin",
    passwordHash: await hashPassword(password),
    totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
    attempts: { failures: [], lockedUntil: null },
    disabled: false,
    createdAt: new Date().toISOString(),
  };
  // Placeholder team members, one per state, so every form of "Comptes" is audited.
  const teammate = (name: string, role: string, changes: object) => ({
    ...account,
    id: randomUUID(),
    email: `${randomUUID()}@audit.test`,
    name,
    role,
    passwordHash: null,
    activation: null,
    ...changes,
  });
  const inAnHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const team = [
    teammate("Personne invitée (fictive)", "reviewer", {
      activation: { codeHash: "0".repeat(64), expiresAt: inAnHour },
    }),
    teammate("Personne active (fictive)", "editor", {
      passwordHash: account.passwordHash,
      totp: { sealedSecret: null, enrolledAt: new Date().toISOString(), lastStep: null },
    }),
    teammate("Personne désactivée (fictive)", "reviewer", {
      passwordHash: account.passwordHash,
      disabled: true,
    }),
  ];
  mkdirSync(join(dataDir, "admin"), { recursive: true });
  writeFileSync(
    join(dataDir, "admin", "accounts.json"),
    JSON.stringify({ schemaVersion: 1, accounts: [account, ...team] }),
  );
}

/** Placeholder searches that found nothing, frequent enough to be shown. */
function seedSearchMisses(dataDir: string): void {
  const miss = (area: "news" | "procedures", query: string, count: number) => ({
    area,
    lang: "fr",
    query,
    count,
    lastOn: "2026-09-28",
  });
  writeFileSync(
    join(dataDir, "search-misses.json"),
    JSON.stringify({
      schemaVersion: 1,
      entries: [miss("procedures", "recherche fictive", 5), miss("news", "autre recherche", 3)],
    }),
  );
}

/** A collection report with the source's protection suspended, as after an outage. */
function seedIngestionStatus(dataDir: string): void {
  const now = new Date().toISOString();
  writeFileSync(
    join(dataDir, "ingestion-status.json"),
    JSON.stringify({
      checkedAt: now,
      lastSuccessAt: now,
      lastChangeAt: null,
      lastDetectionSeconds: null,
      consecutiveFailures: 0,
      lastFailure: null,
      nextAttemptAt: now,
      circuits: [
        { dependency: "presidence.sn", state: "open", consecutiveFailures: 5, openedAt: now },
      ],
    }),
  );
}

/** One notification waiting for a second person, one already approved (not sent). */
function seedNotifications(dataDir: string): void {
  const someone = { id: "audit-autre-personne", name: "Autre personne (fictive)" };
  const base = {
    articleId: ARTICLE_ID,
    lang: "fr",
    title: "Article fictif pour l'audit d'accessibilité",
    category: "communiques",
    preparedBy: someone,
    preparedAt: "2026-09-28T09:00:00Z",
  };
  mkdirSync(join(dataDir, "admin"), { recursive: true });
  writeFileSync(
    join(dataDir, "admin", "notifications.json"),
    JSON.stringify({
      schemaVersion: 1,
      notifications: [
        {
          ...base,
          id: "00000000-0000-4000-8000-00000000a131",
          status: "pending",
          decidedBy: null,
          decidedAt: null,
          delivery: null,
        },
        {
          ...base,
          id: "00000000-0000-4000-8000-00000000a132",
          status: "approved",
          decidedBy: { id: "audit-troisieme", name: "Troisième personne (fictive)" },
          decidedAt: "2026-09-28T09:30:00Z",
          delivery: { outcome: "not-sent", at: "2026-09-28T09:30:00Z" },
        },
      ],
    }),
  );
}

export async function seed(dataDir: string, password: string): Promise<void> {
  seedSearchMisses(dataDir);
  seedNotifications(dataDir);
  seedIngestionStatus(dataDir);
  await seedArticle(dataDir);
  await seedProcedure(dataDir);
  await seedServices(dataDir);
  await seedAccount(dataDir, password);
}

async function postJson(url: string, body: unknown, token?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}`);
  }
  return (await response.json()) as Record<string, string | undefined>;
}

/** Signs in through the real API (password, then a computed code): a session token. */
export async function signIn(api: string, password: string): Promise<string> {
  const first = await postJson(`${api}/admin/v1/auth/password`, {
    email: ACCOUNT_EMAIL,
    password,
  });
  const secret = base32Decode(first["secret"] ?? "");
  if (secret === null) {
    throw new Error("The sign-in did not offer a second factor to set up");
  }
  const second = await postJson(`${api}/admin/v1/auth/code`, {
    challenge: first["challenge"],
    code: codeAt(secret, timeStep(Date.now())),
  });
  const token = second["token"];
  if (token === undefined) {
    throw new Error("The sign-in did not return a session");
  }
  return token;
}

/** Verifies the placeholder service in the console's name: only then does the app show it. */
export async function verifyService(api: string, token: string): Promise<void> {
  await postJson(
    `${api}/admin/v1/services/review`,
    { decision: "verified", ids: [SERVICE_ID] },
    token,
  );
}
