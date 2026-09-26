import { z } from "zod";

/*
 * Shapes of the public GraphQL interface of e-senegal.sn (docs/sources.md). Lenient
 * on optional facts (the source leaves many empty), strict on what identifies a
 * procedure: a change there quarantines the response instead of publishing it.
 */

const optionalText = z.string().nullish();

export const listResponseSchema = z.object({
  data: z.object({
    fetchDemarches: z.object({
      pagination: z.object({ currentPage: z.number(), pageCount: z.number() }),
      results: z.array(z.object({ id: z.string().min(1), slug: z.string().min(1) })),
    }),
  }),
});
export type ListResponse = z.infer<typeof listResponseSchema>;

export const detailSchema = z.object({
  id: z.string().min(1),
  titre: z.string(),
  slug: z.string().min(1),
  resume: optionalText,
  description: optionalText,
  date_publication: optionalText,
  cout: z.number().nullish(),
  delai: z.number().nullish(),
  corps: optionalText,
  qui_peut_faire_reponse: optionalText,
  documents_a_fournir: z.array(z.string().nullable()).nullish(),
  online: z.boolean().nullish(),
  service_administratifs: z
    .array(
      z.object({
        name: optionalText,
        sigle: optionalText,
        adresse: optionalText,
        ville: optionalText,
        region: optionalText,
        telephone: optionalText,
        email: optionalText,
      }),
    )
    .nullish(),
  categories: z.array(z.object({ title: optionalText })).nullish(),
  textes: z.array(z.object({ name: optionalText, description: optionalText })).nullish(),
  faqs: z.array(z.object({ question: optionalText, reponse: optionalText })).nullish(),
  lien_utiles: z.array(z.object({ name: optionalText, url: optionalText })).nullish(),
  demarches: z.array(z.object({ slug: optionalText, titre: optionalText })).nullish(),
});
export type ProcedureDetail = z.infer<typeof detailSchema>;

export const detailResponseSchema = z.object({
  data: z.object({ fetchDemarcheBySlug: detailSchema.nullable() }),
});

export const LIST_QUERY = `query($q: QueryDataConfigInput) {
  fetchDemarches(queryFilter: $q) { pagination { currentPage pageCount } results { id slug } }
}`;

export const DETAIL_QUERY = `query($slug: String!) {
  fetchDemarcheBySlug(slug: $slug) {
    id titre slug resume description date_publication cout delai corps
    qui_peut_faire_reponse documents_a_fournir online
    service_administratifs { name sigle adresse ville region telephone email }
    categories { title } textes { name description } faqs { question reponse }
    lien_utiles { name url } demarches { slug titre }
  }
}`;
