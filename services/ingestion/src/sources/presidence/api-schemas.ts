import { z } from "zod";

/*
 * Shape of the public API used by www.presidence.sn (docs/sources.md). Objects are
 * not strict here: the source may add fields; only what we read is required.
 */

const nullableUrl = z.string().min(1).nullable();

export const baseArticleSchema = z.object({
  id: z.int().positive(),
  published: z.union([z.literal(0), z.literal(1)]),
  categorieId: z.int().positive(),
  date: z.iso.date(),
  image: nullableUrl,
  document_1: nullableUrl,
  document_2: nullableUrl,
  updated_at: z.iso.datetime({ offset: true }),
  deleted_at: z.string().nullable(),
});

export const listResponseSchema = z.object({
  data: z.object({
    current_page: z.int(),
    last_page: z.int(),
    total: z.int(),
    data: z.array(baseArticleSchema.extend({ slug: z.string().min(1), titre: z.string() })),
  }),
});

export const categorySchema = z.object({
  id: z.int().positive(),
  reference: z.string().min(1),
  nom_categorie: z.string().min(1),
});

export const detailResponseSchema = z.object({
  data: z.object({
    article: z.object({
      slug: z.string().min(1),
      titre: z.string(),
      langage: z.string(),
      content: z.string(),
      articleId: z.int().positive(),
      updated_at: z.iso.datetime({ offset: true }),
      article: baseArticleSchema,
    }),
    categories: z.array(categorySchema),
  }),
});

export type DetailResponse = z.infer<typeof detailResponseSchema>;
