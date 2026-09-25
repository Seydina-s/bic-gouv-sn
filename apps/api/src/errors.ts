import type { ApiError, ErrorCode } from "@bgs/shared-types";
import type { FastifyError, FastifyInstance } from "fastify";

/** Codes declared in the shared error catalog (docs/errors-catalog.md). */
export const API_ERROR_CODES = {
  notFound: "ROUTE_NOT_FOUND",
  invalidRequest: "REQUEST_INVALID",
  rateLimited: "RATE_LIMITED",
  notReady: "SERVICE_NOT_READY",
  internal: "INTERNAL_ERROR",
} as const satisfies Record<string, ErrorCode>;

function body(code: ErrorCode, message: string, requestId: string): ApiError {
  return { code, message, requestId };
}

/**
 * Uniform JSON errors. Internal details (stack, messages) are logged, never sent
 * to the client.
 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    return reply
      .code(404)
      .send(body(API_ERROR_CODES.notFound, "This route does not exist", request.id));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation !== undefined) {
      return reply
        .code(400)
        .send(body(API_ERROR_CODES.invalidRequest, "The request is invalid", request.id));
    }
    if (error.statusCode === 429) {
      return reply
        .code(429)
        .send(
          body(API_ERROR_CODES.rateLimited, "Too many requests, please retry shortly", request.id),
        );
    }
    request.log.error({ err: error }, "Unhandled API error");
    return reply
      .code(500)
      .send(body(API_ERROR_CODES.internal, "An unexpected error occurred", request.id));
  });
}
