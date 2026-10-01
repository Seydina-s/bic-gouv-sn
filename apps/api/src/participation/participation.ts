import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PARTICIPATION_KEPT_DAYS,
  participationEntrySchema,
  type ErrorCode,
  type MessageSubmission,
  type ParticipationEntry,
  type ReportSubmission,
} from "@bgs/shared-types";
import sharp from "sharp";
import type { AuditJournal } from "../admin/audit-journal";
import type { Database } from "../database/database";
import {
  type DocumentStore,
  FileDocumentStore,
  PostgresDocumentStore,
} from "../database/document-store";
import type { Person } from "../notifications/notifications";

export type ParticipationStore = DocumentStore<ParticipationEntry>;

export class FileParticipationStore extends FileDocumentStore<ParticipationEntry> {
  constructor(path: string) {
    super(path, participationEntrySchema, "entries");
  }
}

/** Any number: the instances changing the participation take turns. */
const PARTICIPATION_LOCK = 20_261_002;

export class PostgresParticipationStore extends PostgresDocumentStore<ParticipationEntry> {
  constructor(database: Database) {
    super(database, participationEntrySchema, "participation", PARTICIPATION_LOCK);
  }
}

export class ParticipationRuleError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "ParticipationRuleError";
  }
}

/** Longest side of a stored photo: enough to see a pothole, far lighter than a 12 MP shot. */
const PHOTO_SIDE = 1600;
/** Larger pictures are refused before decoding (decompression bombs). */
const MAX_PIXELS = 50_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A photo as it is kept: turned upright, no larger than needed, re-encoded as JPEG,
 * which drops its hidden data (place where it was taken, device). Anything that is
 * not a picture is refused.
 */
export async function cleanPhoto(base64: string): Promise<Buffer> {
  try {
    return await sharp(Buffer.from(base64, "base64"), { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: PHOTO_SIDE, height: PHOTO_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new ParticipationRuleError("PARTICIPATION_PHOTO_INVALID");
  }
}

/** Where the photos are kept: a private folder, never served to the public. */
export class PhotoFolder {
  constructor(private readonly root: string) {}

  private pathOf(id: string): string {
    return join(this.root, `${id}.jpg`);
  }

  async save(id: string, photo: Buffer): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.pathOf(id), photo);
  }

  async read(id: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathOf(id));
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await rm(this.pathOf(id), { force: true });
  }
}

const base = (lang: ParticipationEntry["lang"], text: string, at: string) => ({
  id: randomUUID(),
  receivedAt: at,
  lang,
  text,
  status: "new" as const,
  handledBy: null,
  handledAt: null,
});

/**
 * Participer: what people write to the government and the public problems they
 * report, read by the team in the console. Nothing about the sender is kept, and
 * everything is erased after PARTICIPATION_KEPT_DAYS, photos included.
 */
export class ParticipationService {
  constructor(
    private readonly store: ParticipationStore,
    private readonly photos: PhotoFolder,
    private readonly journal: AuditJournal | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async receiveMessage(submission: MessageSubmission): Promise<ParticipationEntry> {
    const entry: ParticipationEntry = {
      ...base(submission.lang, submission.text, this.now().toISOString()),
      type: "message",
      topic: submission.topic,
    };
    await this.add(entry);
    return entry;
  }

  async receiveReport(submission: ReportSubmission): Promise<ParticipationEntry> {
    const photo = submission.photo === null ? null : await cleanPhoto(submission.photo);
    const photoId = photo === null ? null : randomUUID();
    if (photo !== null && photoId !== null) {
      await this.photos.save(photoId, photo);
    }
    const entry: ParticipationEntry = {
      ...base(submission.lang, submission.text, this.now().toISOString()),
      type: "report",
      category: submission.category,
      place: submission.place === "" ? null : submission.place,
      photoId,
    };
    await this.add(entry);
    return entry;
  }

  /** For the console: newest first. */
  async list(): Promise<ParticipationEntry[]> {
    return (await this.store.all()).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  photo(photoId: string): Promise<Buffer | null> {
    return this.photos.read(photoId);
  }

  /** Dealt with, or passed on to whom it concerns: kept in the history. */
  async markHandled(person: Person, id: string): Promise<ParticipationEntry> {
    const at = this.now().toISOString();
    const handled = await this.store.update((all) => {
      const item = all.find((one) => one.id === id);
      if (item === undefined) {
        throw new ParticipationRuleError("PARTICIPATION_NOT_FOUND");
      }
      const next = { ...item, status: "handled" as const, handledBy: person, handledAt: at };
      return { next: all.map((one) => (one.id === id ? next : one)), result: next };
    });
    await this.journal?.append({
      at,
      actor: person.id,
      action: "participation.handled",
      target: id,
      details: { type: handled.type },
    });
    return handled;
  }

  /** Adds one, and erases what is older than the keeping time (photos included). */
  private async add(entry: ParticipationEntry): Promise<void> {
    const oldest = new Date(this.now().getTime() - PARTICIPATION_KEPT_DAYS * DAY_MS).toISOString();
    const expired = await this.store.update((all) => {
      const kept = all.filter((one) => one.receivedAt >= oldest);
      const gone = all.filter((one) => one.receivedAt < oldest);
      return { next: [...kept, entry], result: gone };
    });
    for (const old of expired) {
      if (old.type === "report" && old.photoId !== null) {
        await this.photos.remove(old.photoId);
      }
    }
  }
}
