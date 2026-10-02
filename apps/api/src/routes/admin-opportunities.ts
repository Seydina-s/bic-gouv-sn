import {
  adminOpportunitiesResponseSchema,
  apiErrorSchema,
  opportunityDraftSchema,
  opportunitySchema,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn, SignedInAccount } from "../admin/sign-in-service";
import type { Person } from "../notifications/notifications";
import { OpportunityRuleError, type OpportunityService } from "../opportunities/opportunities";
import { authorize } from "./admin-guard";

export interface AdminOpportunitiesOptions {
  signIn: AdminSignIn;
  opportunities: OpportunityService;
}

/** How each broken rule is answered. */
const STATUS_OF: Record<string, number> = {
  OPPORTUNITY_NOT_FOUND: 404,
  OPPORTUNITY_NOT_PENDING: 409,
  OPPORTUNITY_SAME_PERSON: 403,
};

async function refuse(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (!(error instanceof OpportunityRuleError)) {
    throw error;
  }
  return reply
    .code(STATUS_OF[error.code] ?? 400)
    .send({ code: error.code, message: error.code, requestId: request.id });
}

/** Who acted, as kept with the opportunity: an id and a name, no e-mail address. */
function personOf(account: SignedInAccount): Person {
  return { id: account.id, name: account.name };
}

const errors = {
  401: apiErrorSchema,
  403: apiErrorSchema,
  404: apiErrorSchema,
  409: apiErrorSchema,
};
const idParams = z.object({ id: z.uuid() });

/**
 * Opportunities in the console: everyone reads; an editor prepares one from its
 * official page; another editor publishes it; either withdraws it.
 */
export const adminOpportunitiesRoutes: FastifyPluginAsyncZod<AdminOpportunitiesOptions> = (
  app,
  { signIn, opportunities },
) => {
  app.get(
    "/opportunities",
    {
      schema: {
        tags: ["admin"],
        summary: "Opportunities prepared, published or withdrawn, latest first",
        response: {
          200: adminOpportunitiesResponseSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return { opportunities: await opportunities.list() };
    },
  );

  app.post(
    "/opportunities",
    {
      schema: {
        tags: ["admin"],
        summary: "Prepare an opportunity from its official page (a second person publishes it)",
        body: opportunityDraftSchema,
        response: { 201: opportunitySchema, ...errors },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "opportunities.edit");
      if (account === null) {
        return reply;
      }
      return reply.code(201).send(await opportunities.prepare(personOf(account), request.body));
    },
  );

  app.put(
    "/opportunities/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Correct an opportunity not yet published",
        params: idParams,
        body: opportunityDraftSchema,
        response: { 200: opportunitySchema, ...errors },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "opportunities.edit");
      if (account === null) {
        return reply;
      }
      try {
        return await opportunities.correct(personOf(account), request.params.id, request.body);
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  for (const decision of ["publish", "withdraw"] as const) {
    app.post(
      `/opportunities/:id/${decision}`,
      {
        schema: {
          tags: ["admin"],
          summary:
            decision === "publish"
              ? "Publish an opportunity prepared by someone else"
              : "Withdraw an opportunity from the app",
          params: idParams,
          response: { 200: opportunitySchema, ...errors },
        },
      },
      async (request, reply) => {
        const account = await authorize(request, reply, signIn, "opportunities.edit");
        if (account === null) {
          return reply;
        }
        try {
          return await opportunities[decision](personOf(account), request.params.id);
        } catch (error) {
          return refuse(request, reply, error);
        }
      },
    );
  }
  return Promise.resolve();
};
