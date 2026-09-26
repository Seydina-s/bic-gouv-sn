import { z } from "zod";
import { httpsUrlSchema } from "../common/primitives.schema";
import { checkTraceableContent, traceableContentShape } from "./traceable-content.schema";

const text = z.string().trim().min(1);

/**
 * An administrative procedure ingested from e-senegal.sn, kept identical to the
 * source (CLAUDE.md §1: we explain and link, we never perform the procedure).
 * The main text (steps, conditions) is the translation body; the structured facts
 * below are shown as they are, and left empty rather than guessed.
 */
export const procedureSchema = z
  .strictObject({
    ...traceableContentShape,
    kind: z.literal("procedure"),
    /** Identifier of the procedure on e-senegal.sn (its public page). */
    slug: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
    /** Short plain-text summary, as written by the source. */
    summary: text.nullable(),
    /** Fee in CFA francs; null when the source gives none (not "free"). */
    costFcfa: z.int().nonnegative().nullable(),
    /** Processing time in days; null when the source gives none. */
    delayDays: z.int().nonnegative().nullable(),
    /** Who can apply, plain text, when the source says it. */
    eligibility: text.nullable(),
    /** Documents to provide, one per entry. */
    documents: z.array(text),
    /** The procedure can be completed online on the official portal. */
    online: z.boolean(),
    categories: z.array(text),
    offices: z.array(
      z.strictObject({
        name: text,
        acronym: text.nullable(),
        address: text.nullable(),
        town: text.nullable(),
        region: text.nullable(),
        phone: text.nullable(),
        email: text.nullable(),
      }),
    ),
    faqs: z.array(z.strictObject({ question: text, answerHtml: text })),
    legalTexts: z.array(z.strictObject({ name: text, description: text.nullable() })),
    usefulLinks: z.array(z.strictObject({ name: text, url: httpsUrlSchema })),
    /** Related procedures, by slug. */
    related: z.array(z.strictObject({ slug: z.string().min(1), title: text })),
  })
  .superRefine(checkTraceableContent);
export type Procedure = z.infer<typeof procedureSchema>;
