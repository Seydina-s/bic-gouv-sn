import { apiErrorSchema, healthResponseSchema, type ErrorCode } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export interface HealthRoutesOptions {
  version: string;
  /** Whether this instance can serve content (e.g. the article store is readable). */
  isReady: () => Promise<boolean>;
}

const NOT_READY: ErrorCode = "SERVICE_NOT_READY";

export const healthRoutes: FastifyPluginAsyncZod<HealthRoutesOptions> = (
  app,
  { version, isReady },
) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness probe",
        response: { 200: healthResponseSchema },
      },
    },
    (_request, reply) => {
      void reply.header("cache-control", "no-store");
      return {
        status: "ok" as const,
        version,
        uptimeSeconds: process.uptime(),
        checkedAt: new Date().toISOString(),
      };
    },
  );

  app.get(
    "/health/ready",
    {
      schema: {
        tags: ["health"],
        summary: "Readiness probe: can this instance serve content?",
        response: { 200: z.strictObject({ status: z.literal("ready") }), 503: apiErrorSchema },
      },
    },
    async (request, reply) => {
      void reply.header("cache-control", "no-store");
      if (await isReady()) {
        return { status: "ready" as const };
      }
      return reply.code(503).send({
        code: NOT_READY,
        message: "This instance cannot read its content yet",
        requestId: request.id,
      });
    },
  );
  return Promise.resolve();
};
