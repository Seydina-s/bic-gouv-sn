import { z } from "zod";
import { httpsUrlSchema, isoDateSchema, isoDateTimeSchema } from "../common/primitives.schema";

/*
 * Opportunités (decision of the user, 01/10/2026): trainings, jobs, calls for
 * applications, tenders… published by the State, entered in the console by the
 * team from the official portal, checked by a second person, always with the
 * official link (CLAUDE.md §1: nothing invented, everything traceable).
 */

export const OPPORTUNITY_KINDS = [
  "emploi",
  "concours",
  "formation",
  "candidature",
  "financement",
  "bourse",
  "appel-offres",
] as const;
export const opportunityKindSchema = z.enum(OPPORTUNITY_KINDS);
export type OpportunityKind = z.infer<typeof opportunityKindSchema>;

/**
 * Official portals an opportunity may point to (docs/cadrage, 01/10/2026): every
 * State domain (.gouv.sn) and the agencies' own portals. A subdomain counts.
 */
export const OPPORTUNITY_SOURCE_DOMAINS = [
  "gouv.sn",
  "presidence.sn",
  "e-senegal.sn",
  "marchespublics.sn",
  "der.sn",
  "adepme.sn",
  "fongip.sn",
  "3fpt.sn",
  "directiondesbourses.sn",
  "campusen.sn",
  "mesrisenegal.sn",
  "sgee-sn.org",
] as const;

/** True when the link leads to an official portal. Never throws. */
export function isOfficialOpportunityUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return OPPORTUNITY_SOURCE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export const officialOpportunityUrlSchema = httpsUrlSchema.refine(isOfficialOpportunityUrl, {
  message: "The link must lead to an official portal",
});

const personSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

/** What the team writes, copied from the official page. */
export const opportunityDraftSchema = z.strictObject({
  kind: opportunityKindSchema,
  title: z.string().trim().min(3).max(200),
  organization: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(10).max(600),
  /** The closing date given by the official page; none when it gives none. */
  deadline: isoDateSchema.nullable(),
  officialUrl: officialOpportunityUrlSchema,
});
export type OpportunityDraft = z.infer<typeof opportunityDraftSchema>;

/** One opportunity as the console keeps it, with who did what. */
export const opportunitySchema = opportunityDraftSchema.extend({
  id: z.uuid(),
  /** Pending: waits for a second person; published: in the app; withdrawn: no longer. */
  status: z.enum(["pending", "published", "withdrawn"]),
  preparedBy: personSchema,
  preparedAt: isoDateTimeSchema,
  publishedBy: personSchema.nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  withdrawnBy: personSchema.nullable(),
  withdrawnAt: isoDateTimeSchema.nullable(),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

/** What the app shows: what was published, nothing about the team. */
export const publicOpportunitySchema = opportunityDraftSchema.extend({
  id: z.uuid(),
  publishedAt: isoDateTimeSchema,
});
export type PublicOpportunity = z.infer<typeof publicOpportunitySchema>;

export const opportunitiesResponseSchema = z.object({
  opportunities: z.array(publicOpportunitySchema),
});
export type OpportunitiesResponse = z.infer<typeof opportunitiesResponseSchema>;

export const adminOpportunitiesResponseSchema = z.object({
  opportunities: z.array(opportunitySchema),
});

/** Still open on `today` (YYYY-MM-DD): no closing date, or not past it. */
export function isOpen(opportunity: Pick<OpportunityDraft, "deadline">, today: string): boolean {
  return opportunity.deadline === null || opportunity.deadline >= today;
}

/** Closing soonest first; those without a closing date after, latest published first. */
export function byClosingDate(
  a: Pick<PublicOpportunity, "deadline" | "publishedAt">,
  b: Pick<PublicOpportunity, "deadline" | "publishedAt">,
): number {
  if (a.deadline !== null && b.deadline !== null && a.deadline !== b.deadline) {
    return a.deadline.localeCompare(b.deadline);
  }
  if ((a.deadline === null) !== (b.deadline === null)) {
    return a.deadline === null ? 1 : -1;
  }
  return b.publishedAt.localeCompare(a.publishedAt);
}
