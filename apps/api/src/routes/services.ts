import { createHash } from "node:crypto";
import type { StateServiceStore } from "@bgs/content-store";
import { correctedFacts, stateServicesResponseSchema, type StateService } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export interface ServicesRoutesOptions {
  services: StateServiceStore;
}

/** Services change rarely (a person verifies them): same freshness as the procedures. */
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

type ShownService = StateService & { reviewedAt: string };

/** Only services a person verified are ever public. */
function isShown(service: StateService): service is ShownService {
  return service.status === "verified" && service.reviewedAt !== null;
}

/** The public face of a service: its corrected facts, when it was verified, its origin. */
function toPublic(service: ShownService) {
  return {
    id: service.id,
    ...correctedFacts(service),
    verifiedAt: service.reviewedAt,
    origin: service.origin.kind,
  };
}

/**
 * The verified state services and the towns, in one cacheable answer: the phone
 * computes distances itself, so the person's location is never sent (CLAUDE.md §1).
 */
export const servicesRoutes: FastifyPluginAsyncZod<ServicesRoutesOptions> = (app, { services }) => {
  app.get(
    "/services",
    {
      schema: {
        tags: ["services"],
        summary: "Verified state services and towns (the phone finds the nearest ones)",
        response: { 200: stateServicesResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const file = await services.read();
      const verified = Object.values(file.services)
        .filter(isShown)
        .map(toPublic)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      const body = { services: verified, places: file.places };
      const etag = `"${createHash("sha256").update(JSON.stringify(body)).digest("base64url").slice(0, 27)}"`;
      void reply.header("etag", etag).header("cache-control", CACHE_CONTROL);
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send(null);
      }
      return body;
    },
  );
  return Promise.resolve();
};
