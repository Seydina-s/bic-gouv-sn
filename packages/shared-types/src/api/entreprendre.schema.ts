import { z } from "zod";
import { httpsUrlSchema, isoDateSchema, isoDateTimeSchema } from "../common/primitives.schema";
import { blockSchema } from "./news.schema";

/*
 * Entreprendre (owner's request of 12/10/2026, DER-01): the offer of the Délégation
 * générale à l'Entrepreneuriat rapide des Femmes et des Jeunes (DER/FJ), read on its
 * official site der.sn. Its texts are shown in our own layout, never rewritten; each
 * page keeps its link and the day it was read (CLAUDE.md §1).
 */

export const DER_ORIGIN = "https://www.der.sn";

export const ENTREPRENDRE_GROUPS = [
  "der",
  "deposer",
  "financer",
  "accompagner",
  "trouver",
] as const;
export type EntreprendreGroup = (typeof ENTREPRENDRE_GROUPS)[number];

/** The pages of der.sn the space shows, each under its group, in this order. */
export const ENTREPRENDRE_PAGES = [
  { slug: "presentation", path: "la-der-fj/presentation/", group: "der" },
  {
    slug: "comment-deposer",
    path: "devenez-entrepreneur/comment-deposer-un-dossier-a-la-der/",
    group: "deposer",
  },
  {
    slug: "types-de-financements",
    path: "devenez-entrepreneur/types-de-financements/",
    group: "financer",
  },
  {
    slug: "accompagnement-financier",
    path: "devenez-entrepreneur/accompagnement-financier/",
    group: "financer",
  },
  {
    slug: "secteurs-prioritaires",
    path: "devenez-entrepreneur/secteurs-prioritaires/",
    group: "financer",
  },
  {
    slug: "formation-assistance",
    path: "devenez-entrepreneur/accompagnement-non-financier/",
    group: "accompagner",
  },
  {
    slug: "formalisation",
    path: "devenez-entrepreneur/formalisation-et-renforcement-de-capacites/",
    group: "accompagner",
  },
  {
    slug: "guichet-unique",
    path: "devenez-entrepreneur/guichet-unique-de-formalisation-des-entreprises/",
    group: "accompagner",
  },
  {
    slug: "antennes",
    path: "deploiement-territorial/adresses-des-antennes-departementales/",
    group: "trouver",
  },
  {
    slug: "points-nano-credit",
    path: "deploiement-territorial/adresses-des-points-nano-credits/",
    group: "trouver",
  },
] as const satisfies readonly { slug: string; path: string; group: EntreprendreGroup }[];

export type EntreprendreSlug = (typeof ENTREPRENDRE_PAGES)[number]["slug"];
export const entreprendreSlugSchema = z.enum(
  ENTREPRENDRE_PAGES.map((page) => page.slug) as [EntreprendreSlug, ...EntreprendreSlug[]],
);

/** One official page as kept: its words, cleaned, with where and when they were read. */
export const entreprendrePageSchema = z.object({
  slug: entreprendreSlugSchema,
  group: z.enum(ENTREPRENDRE_GROUPS),
  title: z.string().min(1),
  sourceUrl: httpsUrlSchema,
  /** When der.sn last changed the page, as it says. */
  sourceUpdatedAt: isoDateTimeSchema.nullable(),
  fetchedAt: isoDateTimeSchema,
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  /** 1, then one more each time the page's words change (never overwritten silently). */
  version: z.int().positive(),
  bodyHtml: z.string().min(1),
});
export type EntreprendrePage = z.infer<typeof entreprendrePageSchema>;

/** One news item of der.sn: its title and first words, opened on the official site. */
export const entreprendreNewsSchema = z.object({
  title: z.string().min(1),
  publishedOn: isoDateSchema,
  sourceUrl: httpsUrlSchema,
  excerpt: z.string(),
});
export type EntreprendreNews = z.infer<typeof entreprendreNewsSchema>;

/** What the collection keeps (one document). */
export const entreprendreDocumentSchema = z.object({
  pages: z.array(entreprendrePageSchema),
  news: z.array(entreprendreNewsSchema),
  /** When the news list was last read. */
  newsFetchedAt: isoDateTimeSchema.nullable(),
});
export type EntreprendreDocument = z.infer<typeof entreprendreDocumentSchema>;

export const EMPTY_ENTREPRENDRE: EntreprendreDocument = {
  pages: [],
  news: [],
  newsFetchedAt: null,
};

/** GET /v1/entreprendre: the pages by group, and the latest news. */
export const entreprendreOverviewSchema = z.object({
  pages: z.array(
    z.object({
      slug: entreprendreSlugSchema,
      group: z.enum(ENTREPRENDRE_GROUPS),
      title: z.string(),
      /** Its first words, for the card. */
      excerpt: z.string(),
      sourceUrl: httpsUrlSchema,
    }),
  ),
  news: z.array(entreprendreNewsSchema),
});
export type EntreprendreOverview = z.infer<typeof entreprendreOverviewSchema>;

/** GET /v1/entreprendre/:slug: one page as structured blocks. */
export const entreprendreDetailSchema = z.object({
  slug: entreprendreSlugSchema,
  group: z.enum(ENTREPRENDRE_GROUPS),
  title: z.string(),
  sourceUrl: httpsUrlSchema,
  fetchedAt: isoDateTimeSchema,
  blocks: z.array(blockSchema),
});
export type EntreprendreDetail = z.infer<typeof entreprendreDetailSchema>;
