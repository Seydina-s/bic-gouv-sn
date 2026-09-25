import { resolve } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyRequest } from "fastify";

export const MEDIA_PREFIX = "/media";

/**
 * Processed files are named after their source URL and never rewritten in place in
 * practice: a week of freshness, then served stale while a CDN revalidates.
 */
const MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400";

/** Serves the processed media folder read-only: no listing, no index, no dotfiles. */
export async function registerMedia(app: FastifyInstance, root: string): Promise<void> {
  await app.register(fastifyStatic, {
    root: resolve(root),
    prefix: `${MEDIA_PREFIX}/`,
    decorateReply: false,
    index: false,
    list: false,
    dotfiles: "deny",
    cacheControl: false,
    setHeaders: (reply) => {
      void reply.header("cache-control", MEDIA_CACHE_CONTROL);
    },
  });
}

/** Where clients fetch media: the configured CDN, or this API itself in development. */
export function mediaBaseUrlFor(request: FastifyRequest, configured: string | undefined): string {
  return configured ?? `${request.protocol}://${request.host}${MEDIA_PREFIX}`;
}
