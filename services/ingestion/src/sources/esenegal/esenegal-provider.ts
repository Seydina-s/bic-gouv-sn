import type { Procedure } from "@bgs/shared-types";
import { CircuitBreaker, createResilientCall } from "@bgs/resilience";
import type { z } from "zod";
import { QuarantineError, SourceUnreachableError } from "../../lib/errors";
import { createRateLimiter } from "../../lib/rate-limiter";
import { USER_AGENT } from "../presidence/presidence-provider";
import { DETAIL_QUERY, detailResponseSchema, LIST_QUERY, listResponseSchema } from "./api-schemas";
import { canonicalProcedureUrl, normalizeProcedure } from "./normalize";

/** Public GraphQL interface used by the official site itself (docs/sources.md). */
export const ESENEGAL_API = "https://gateway.e-senegal.sn/citoyen/v1";
const PAGE_SIZE = 100;

export interface ProcedureListPage {
  slugs: string[];
  pageCount: number;
}

export interface ProcedureSource {
  listPage(page: number): Promise<ProcedureListPage>;
  fetchProcedure(slug: string): Promise<Procedure>;
}

export interface EsenegalProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Minimum spacing between two requests (politeness). */
  intervalMs?: number;
}

/** Reads e-senegal.sn procedures, politely and resiliently (1 request per second). */
export function createEsenegalProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: EsenegalProviderOptions = {}): ProcedureSource {
  const schedule = createRateLimiter(intervalMs);
  const call = createResilientCall({
    breaker: new CircuitBreaker({
      dependency: "e-senegal.sn",
      failureThreshold: 5,
      resetTimeoutMs: 60_000,
      isFailure: (error) => !(error instanceof QuarantineError),
    }),
    timeoutMs: 20_000,
    retry: {
      idempotent: true,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      shouldRetry: (error) =>
        !(error instanceof SourceUnreachableError && error.status !== null && error.status < 500),
    },
  });

  async function query<S extends z.ZodType>(
    document: string,
    variables: Record<string, unknown>,
    schema: S,
    ref: string,
  ) {
    const body = await call((signal) =>
      schedule(async () => {
        const response = await fetchImpl(ESENEGAL_API, {
          method: "POST",
          signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({ query: document, variables }),
        }).catch((error: unknown) => {
          throw signal.aborted ? error : new SourceUnreachableError(ESENEGAL_API, null);
        });
        if (!response.ok) {
          throw new SourceUnreachableError(ESENEGAL_API, response.status);
        }
        return (await response.json()) as unknown;
      }),
    );
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new QuarantineError(ref, "unexpected response shape (source structure changed?)");
    }
    return parsed.data;
  }

  return {
    async listPage(page) {
      const list = await query(
        LIST_QUERY,
        { q: { page, limit: PAGE_SIZE } },
        listResponseSchema,
        `${ESENEGAL_API}#page-${String(page)}`,
      );
      const { pagination, results } = list.data.fetchDemarches;
      return { slugs: results.map((item) => item.slug), pageCount: pagination.pageCount };
    },

    async fetchProcedure(slug) {
      const ref = canonicalProcedureUrl(slug);
      const detail = await query(DETAIL_QUERY, { slug }, detailResponseSchema, ref);
      const found = detail.data.fetchDemarcheBySlug;
      if (found === null) {
        throw new QuarantineError(ref, "procedure not found at the source");
      }
      return normalizeProcedure(found, now().toISOString());
    },
  };
}
