import { z } from "zod";
import { isoDateTimeSchema, langSchema } from "../common/primitives.schema";

/*
 * Participer (decision of the user, 01/10/2026): people write to the government
 * (ideas to serve citizens better, opinions on the app…) and report a public
 * problem with a photo. Anonymous: no account, no address kept, the photo's hidden
 * data (place, device) removed. Read by the team in the console, never shown in
 * the app.
 */

export const MESSAGE_TOPICS = ["gouvernement", "application", "autre"] as const;
export const messageTopicSchema = z.enum(MESSAGE_TOPICS);
export type MessageTopic = z.infer<typeof messageTopicSchema>;

export const REPORT_CATEGORIES = ["voirie", "eclairage", "salubrite", "eau", "autre"] as const;
export const reportCategorySchema = z.enum(REPORT_CATEGORIES);
export type ReportCategory = z.infer<typeof reportCategorySchema>;

const textSchema = z.string().trim().min(10).max(2000);

/** A photo sent with a report, as base64 (JPEG or PNG), 6 MB at most once decoded. */
export const PHOTO_MAX_BYTES = 6 * 1024 * 1024;
const photoSchema = z
  .string()
  .max(Math.ceil((PHOTO_MAX_BYTES * 4) / 3) + 4)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/);

export const messageSubmissionSchema = z.strictObject({
  topic: messageTopicSchema,
  text: textSchema,
  lang: langSchema,
});
export type MessageSubmission = z.infer<typeof messageSubmissionSchema>;

/** The kind of problem written by the person when none of the types fits. */
export const REPORT_DETAIL_MAX = 80;
const detailSchema = z.string().trim().min(3).max(REPORT_DETAIL_MAX);

export const reportSubmissionSchema = z
  .strictObject({
    category: reportCategorySchema,
    /** Required for "autre" (owner's request, 02/10/2026), absent for the others. */
    detail: detailSchema.nullable(),
    text: textSchema,
    /** The district or town, as the person writes it; never a position. */
    place: z.string().trim().max(120).nullable(),
    photo: photoSchema.nullable(),
    lang: langSchema,
  })
  .refine((report) => (report.category === "autre") === (report.detail !== null), {
    path: ["detail"],
    message: "The kind of problem is said for, and only for, the other ones",
  });
export type ReportSubmission = z.infer<typeof reportSubmissionSchema>;

export const submissionReceiptSchema = z.object({ id: z.uuid() });

const personSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

const entryBase = {
  id: z.uuid(),
  receivedAt: isoDateTimeSchema,
  lang: langSchema,
  text: textSchema,
  /** New: not yet read through; handled: dealt with (or passed on) by the team. */
  status: z.enum(["new", "handled"]),
  handledBy: personSchema.nullable(),
  handledAt: isoDateTimeSchema.nullable(),
};

export const participationEntrySchema = z.discriminatedUnion("type", [
  z.object({ ...entryBase, type: z.literal("message"), topic: messageTopicSchema }),
  z.object({
    ...entryBase,
    type: z.literal("report"),
    category: reportCategorySchema,
    /** Entries received before 02/10/2026 have none. */
    detail: z.string().max(REPORT_DETAIL_MAX).nullable().default(null),
    place: z.string().max(120).nullable(),
    /** The stored photo's name, served to the console only. */
    photoId: z.uuid().nullable(),
  }),
]);
export type ParticipationEntry = z.infer<typeof participationEntrySchema>;

export const participationResponseSchema = z.object({
  entries: z.array(participationEntrySchema),
});

/** Kept this long, then erased with its photo (decision to confirm, 01/10/2026). */
export const PARTICIPATION_KEPT_DAYS = 365;
