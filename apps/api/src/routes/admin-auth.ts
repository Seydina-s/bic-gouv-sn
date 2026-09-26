import { ROLES } from "@bgs/admin-auth";
import { apiErrorSchema, type ErrorCode } from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn } from "../admin/sign-in-service";

export interface AdminAuthRoutesOptions {
  signIn: AdminSignIn;
}

/** Sign-in routes are a guessing target: far below the general limit. */
const SIGN_IN_RATE = { max: 10, timeWindow: "1 minute" } as const;

const accountSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
});

function refuse(
  request: FastifyRequest,
  reply: FastifyReply,
  status: 401 | 429,
  code: ErrorCode,
  message: string,
) {
  return reply.code(status).send({ code, message, requestId: request.id });
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{20,})$/.exec(header);
  return match?.[1] ?? null;
}

/**
 * Admin console sign-in (/admin/v1/auth). Called by the console's server, which
 * keeps the session token in a secure cookie; never cached anywhere.
 */
export const adminAuthRoutes: FastifyPluginAsyncZod<AdminAuthRoutesOptions> = (app, { signIn }) => {
  app.addHook("onSend", (_request, reply, payload, done) => {
    void reply.header("cache-control", "no-store");
    done(null, payload);
  });

  app.post(
    "/auth/password",
    {
      config: { rateLimit: SIGN_IN_RATE },
      schema: {
        tags: ["admin"],
        summary: "First step: e-mail and password",
        body: z.object({ email: z.string().max(254), password: z.string().max(1024) }),
        response: {
          200: z.discriminatedUnion("step", [
            z.object({ step: z.literal("code"), challenge: z.string() }),
            z.object({
              step: z.literal("enroll"),
              challenge: z.string(),
              otpauthUri: z.string(),
              secret: z.string(),
            }),
          ]),
          401: apiErrorSchema,
          429: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const outcome = await signIn.checkPassword(request.body.email, request.body.password);
      switch (outcome.kind) {
        case "code":
          return { step: "code" as const, challenge: outcome.challenge };
        case "enroll":
          return {
            step: "enroll" as const,
            challenge: outcome.challenge,
            otpauthUri: outcome.otpauthUri,
            secret: outcome.secret,
          };
        case "locked":
          return refuse(request, reply, 429, "ADMIN_TOO_MANY_ATTEMPTS", "Account locked");
        case "failed":
          return refuse(request, reply, 401, "ADMIN_SIGN_IN_FAILED", "Sign-in failed");
      }
    },
  );

  app.post(
    "/auth/code",
    {
      config: { rateLimit: SIGN_IN_RATE },
      schema: {
        tags: ["admin"],
        summary: "Second step: the one-time code; returns the session token",
        body: z.object({ challenge: z.string().max(128), code: z.string().max(16) }),
        response: {
          200: z.object({ token: z.string(), account: accountSchema }),
          401: apiErrorSchema,
          429: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const outcome = await signIn.checkCode(request.body.challenge, request.body.code);
      switch (outcome.kind) {
        case "signed-in":
          return { token: outcome.token, account: outcome.account };
        case "locked":
          return refuse(request, reply, 429, "ADMIN_TOO_MANY_ATTEMPTS", "Account locked");
        case "expired":
          return refuse(request, reply, 401, "ADMIN_SESSION_EXPIRED", "Sign-in step expired");
        case "failed":
          return refuse(request, reply, 401, "ADMIN_SIGN_IN_FAILED", "Sign-in failed");
      }
    },
  );

  app.get(
    "/auth/me",
    {
      schema: {
        tags: ["admin"],
        summary: "The signed-in account (Authorization: Bearer <token>)",
        response: { 200: accountSchema, 401: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const token = bearerToken(request);
      const account = token === null ? null : await signIn.whoIs(token);
      if (account === null) {
        return refuse(request, reply, 401, "ADMIN_SESSION_EXPIRED", "Not signed in");
      }
      return account;
    },
  );

  app.post(
    "/auth/sign-out",
    { schema: { tags: ["admin"], summary: "Ends the session", response: { 204: z.null() } } },
    async (request, reply) => {
      const token = bearerToken(request);
      if (token !== null) {
        await signIn.signOut(token);
      }
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
