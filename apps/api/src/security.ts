import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Config } from "./config";

/**
 * Baseline protection of the public API (CLAUDE.md §4.5, audit AUD-04):
 * - security headers (strict CSP in production: the API only serves JSON);
 * - per-address rate limit, deliberately generous because Senegalese mobile
 *   operators put many subscribers behind one public address (carrier-grade NAT).
 *   The CDN in front absorbs normal peaks; this limit only stops abuse.
 */
export async function registerSecurity(app: FastifyInstance, config: Config): Promise<void> {
  await app.register(helmet, {
    // Swagger UI (development only) needs inline scripts and styles.
    contentSecurityPolicy:
      config.NODE_ENV === "production"
        ? { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }
        : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: "1 minute",
    // Probes from the load balancer and monitoring are never limited.
    allowList: (request) => request.url.startsWith("/v1/health"),
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: `Too many requests, retry in ${context.after}`,
    }),
  });
}
