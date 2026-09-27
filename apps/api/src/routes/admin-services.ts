import type { FileStateServiceStore } from "@bgs/content-store";
import {
  apiErrorSchema,
  byDistance,
  correctedFacts,
  geoPointSchema,
  serviceCategorySchema,
  serviceFactsSchema,
  type Place,
  type StateService,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

export interface AdminServicesOptions {
  signIn: AdminSignIn;
  journal: AuditJournal;
  services: FileStateServiceStore;
}

/** A batch stays small enough to be checked by the person who verifies it. */
const MAX_BATCH = 200;

const reviewItemSchema = z.object({
  id: z.string(),
  category: serviceCategorySchema,
  name: z.string(),
  address: z.string().nullable(),
  town: z.string().nullable(),
  location: geoPointSchema,
  phone: z.string().nullable(),
  website: z.string().nullable(),
  openingHours: z.string().nullable(),
  status: z.enum(["proposed", "verified", "rejected"]),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  /** What the source says now, when it changed after the review. */
  pendingUpdate: serviceFactsSchema.nullable(),
  /** The object on openstreetmap.org, to check it on the map; null when typed by hand. */
  osmUrl: z.string().nullable(),
  /** Nearest town, a hint for services named only "Mairie" or "Annexe". */
  nearTown: z.string().nullable(),
  /** What the source says, when a person corrected the kind or the name. */
  source: z.object({ category: serviceCategorySchema, name: z.string() }).nullable(),
});

/** Beyond this, the nearest town says nothing useful about where a service is. */
const NEAR_TOWN_METERS = 15_000;

function nearTownOf(service: StateService, places: readonly Place[]): string | null {
  const [nearest] = byDistance(service.location, places, (place) => place.location);
  return nearest !== undefined && nearest.meters <= NEAR_TOWN_METERS ? nearest.item.name : null;
}

function osmUrlOf(service: StateService): string | null {
  const { origin } = service;
  return origin.kind === "osm"
    ? `https://www.openstreetmap.org/${origin.osmType}/${String(origin.osmId)}`
    : null;
}

/**
 * Verification of the state services in the console (editor role and above): the
 * imported proposals, then a decision by batches, each written to the audit journal.
 * Only verified services reach the app.
 */
export const adminServicesRoutes: FastifyPluginAsyncZod<AdminServicesOptions> = (
  app,
  { signIn, journal, services },
) => {
  app.addHook("onSend", (_request, reply, payload, done) => {
    void reply.header("cache-control", "no-store");
    done(null, payload);
  });

  app.get(
    "/services",
    {
      schema: {
        tags: ["admin"],
        summary: "Every state service with its review status",
        response: {
          200: z.object({ services: z.array(reviewItemSchema) }),
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "services.edit")) === null) {
        return reply;
      }
      const file = await services.read();
      return {
        services: Object.values(file.services)
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .map((service) => ({
            id: service.id,
            ...correctedFacts(service),
            status: service.status,
            reviewedBy: service.reviewedBy,
            reviewedAt: service.reviewedAt,
            pendingUpdate: service.pendingUpdate,
            osmUrl: osmUrlOf(service),
            nearTown: nearTownOf(service, file.places),
            source:
              Object.keys(service.corrections).length === 0
                ? null
                : { category: service.category, name: service.name },
          })),
      };
    },
  );

  app.post(
    "/services/review",
    {
      schema: {
        tags: ["admin"],
        summary: "A person verifies (shown in the app) or rejects a batch of services",
        body: z.object({
          decision: z.enum(["verified", "rejected"]),
          ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_BATCH),
        }),
        response: {
          200: z.object({ reviewed: z.int() }),
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "services.edit");
      if (account === null) {
        return reply;
      }
      const { decision, ids } = request.body;
      const known = (await services.read()).services;
      if (ids.some((id) => known[id] === undefined)) {
        return reply.code(400).send({
          code: "REQUEST_INVALID",
          message: "Unknown service",
          requestId: request.id,
        });
      }
      const at = new Date().toISOString();
      const reviewed = await services.review(ids, decision, account.id, at);
      await journal.append({
        at,
        actor: account.id,
        action: decision === "verified" ? "service.verified" : "service.rejected",
        target: "state-services",
        details: { count: reviewed.length, ids: reviewed.join(",") },
      });
      return { reviewed: reviewed.length };
    },
  );

  app.patch(
    "/services/:id/correction",
    {
      schema: {
        tags: ["admin"],
        summary: "A person corrects the kind or the name of a service (kept over imports)",
        params: z.object({ id: z.string().min(1).max(64) }),
        body: z
          .object({
            category: serviceCategorySchema.optional(),
            name: z.string().trim().min(1).max(200).optional(),
          })
          .refine((body) => body.category !== undefined || body.name !== undefined),
        response: {
          200: z.object({ corrected: z.boolean() }),
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "services.edit");
      if (account === null) {
        return reply;
      }
      const { category, name } = request.body;
      const correction = {
        ...(category === undefined ? {} : { category }),
        ...(name === undefined ? {} : { name }),
      };
      const corrected = await services.correct(request.params.id, correction);
      if (corrected === null) {
        return reply.code(404).send({
          code: "REQUEST_INVALID",
          message: "Unknown service",
          requestId: request.id,
        });
      }
      await journal.append({
        at: new Date().toISOString(),
        actor: account.id,
        action: "service.corrected",
        target: corrected.id,
        details: { ...correction },
      });
      return { corrected: true };
    },
  );

  return Promise.resolve();
};
