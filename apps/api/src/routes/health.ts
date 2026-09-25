import { healthResponseSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export interface HealthRoutesOptions {
  version: string;
}

export const healthRoutes: FastifyPluginAsyncZod<HealthRoutesOptions> = (app, { version }) => {
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
  return Promise.resolve();
};
