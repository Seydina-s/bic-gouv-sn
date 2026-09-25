import type { Lang, NewsArticle } from "@bgs/shared-types";
import { CircuitBreaker, createResilientCall } from "@bgs/resilience";
import type { z } from "zod";
import { QuarantineError, SourceUnreachableError } from "../../lib/errors";
import { createRateLimiter } from "../../lib/rate-limiter";
import type { SourceArticleRef, SourceProvider } from "../source-provider";
import { detailResponseSchema, listResponseSchema } from "./api-schemas";
import { normalizeDetail, normalizeMediaUrl, presidenceArticleId } from "./normalize";

export const PRESIDENCE_API = "https://bo-admin.presidence.sn/api/front";

/** Identifies the project to the source, as a polite crawler should. */
export const USER_AGENT = "BicGouvSN-ingestion/0.1 (+https://github.com/Seydina-s/bic-gouv-sn)";

export interface PresidenceProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Minimum spacing between two requests to the source (politeness). */
  intervalMs?: number;
}

/** Reads presidence.sn through the public JSON API its own website uses. */
export function createPresidenceProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: PresidenceProviderOptions = {}): SourceProvider {
  const schedule = createRateLimiter(intervalMs);
  const call = createResilientCall({
    breaker: new CircuitBreaker({
      dependency: "presidence.sn",
      failureThreshold: 5,
      resetTimeoutMs: 60_000,
      isFailure: (error) => !(error instanceof QuarantineError),
    }),
    timeoutMs: 15_000,
    retry: {
      idempotent: true,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      // A 4xx (e.g. an article removed at the source) is not transient: no retry.
      shouldRetry: (error) =>
        !(error instanceof SourceUnreachableError && error.status !== null && error.status < 500),
    },
  });

  async function getJson<S extends z.ZodType>(path: string, lang: Lang, schema: S) {
    const url = `${PRESIDENCE_API}${path}`;
    const body = await call((signal) =>
      schedule(async () => {
        const response = await fetchImpl(url, {
          signal,
          headers: {
            Accept: "application/json",
            "Accept-Language": lang,
            "User-Agent": USER_AGENT,
          },
        }).catch((error: unknown) => {
          // Network failure (DNS, TLS, connection reset): reported with its catalog code.
          throw signal.aborted ? error : new SourceUnreachableError(url, null);
        });
        if (!response.ok) {
          throw new SourceUnreachableError(url, response.status);
        }
        return (await response.json()) as unknown;
      }),
    );
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new QuarantineError(url, "unexpected response shape (source structure changed?)");
    }
    return parsed.data;
  }

  return {
    async listPage(lang, page) {
      const list = await getJson(
        `/articles?page=${String(page)}&q=&categoryIds=`,
        lang,
        listResponseSchema,
      );
      return {
        lastPage: list.data.last_page,
        refs: list.data.data.map((item) => ({
          sourceId: item.id,
          slug: item.slug,
          lang,
          sourceUpdatedAt: item.updated_at,
          coverSourceUrl: item.image === null ? null : normalizeMediaUrl(item.image),
        })),
      };
    },

    articleIdFor: (ref) => presidenceArticleId(ref.sourceId),

    async downloadMedia(url) {
      const data = await call((signal) =>
        schedule(async () => {
          const response = await fetchImpl(url, {
            signal,
            headers: { "User-Agent": USER_AGENT },
          }).catch((error: unknown) => {
            throw signal.aborted ? error : new SourceUnreachableError(url, null);
          });
          if (!response.ok) {
            throw new SourceUnreachableError(url, response.status);
          }
          return response.arrayBuffer();
        }),
      );
      return Buffer.from(data);
    },

    async fetchArticle(ref: SourceArticleRef): Promise<NewsArticle> {
      const detail = await getJson(
        `/article/${encodeURIComponent(ref.slug)}`,
        ref.lang,
        detailResponseSchema,
      );
      return normalizeDetail(detail, { lang: ref.lang, fetchedAt: now().toISOString() });
    },
  };
}
