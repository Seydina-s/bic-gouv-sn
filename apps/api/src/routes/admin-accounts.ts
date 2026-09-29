import {
  accountsResponseSchema,
  accountViewSchema,
  activateAccountSchema,
  activationSchema,
  apiErrorSchema,
  changeRoleSchema,
  createAccountSchema,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { AccountRuleError, type AccountAdmin } from "../admin/account-admin";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

export interface AdminAccountsOptions {
  signIn: AdminSignIn;
  accountAdmin: AccountAdmin;
}

/** Activation is a guessing target, like the sign-in: far below the general limit. */
const ACTIVATION_RATE = { max: 10, timeWindow: "1 minute" } as const;

/** How each broken rule is answered. */
const STATUS_OF: Record<string, number> = {
  ACCOUNT_NOT_FOUND: 404,
  ACCOUNT_SELF: 403,
  ADMIN_FORBIDDEN: 403,
  ACCOUNT_EMAIL_TAKEN: 409,
  ACCOUNT_ALREADY_ACTIVE: 409,
  ACCOUNT_ACTIVATION_INVALID: 401,
  ACCOUNT_PASSWORD_REJECTED: 422,
};

async function refuse(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (!(error instanceof AccountRuleError)) {
    throw error;
  }
  return reply
    .code(STATUS_OF[error.code] ?? 400)
    .send({ code: error.code, message: error.code, requestId: request.id });
}

const errors = {
  401: apiErrorSchema,
  403: apiErrorSchema,
  404: apiErrorSchema,
  409: apiErrorSchema,
};

const params = z.object({ id: z.uuid() });

/**
 * The team's accounts (ADM-10), for administrators only; and the activation of a
 * new account by its person, who has no session yet. Never cached anywhere: the
 * answers carry e-mail addresses and one-time codes.
 */
export const adminAccountsRoutes: FastifyPluginAsyncZod<AdminAccountsOptions> = (
  app,
  { signIn, accountAdmin },
) => {
  app.addHook("onSend", (_request, reply, payload, done) => {
    void reply.header("cache-control", "no-store");
    done(null, payload);
  });

  app.get(
    "/accounts",
    {
      schema: {
        tags: ["admin"],
        summary: "The team's accounts, oldest first",
        response: { 200: accountsResponseSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "users.manage")) === null) {
        return reply;
      }
      return { accounts: await accountAdmin.list() };
    },
  );

  app.post(
    "/accounts",
    {
      schema: {
        tags: ["admin"],
        summary: "Create an account; returns its one-time activation code",
        body: createAccountSchema,
        response: { 201: activationSchema, ...errors },
      },
    },
    async (request, reply) => {
      const actor = await authorize(request, reply, signIn, "users.manage");
      if (actor === null) {
        return reply;
      }
      try {
        return await reply.code(201).send(await accountAdmin.create(actor.id, request.body));
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  app.post(
    "/accounts/:id/role",
    {
      schema: {
        tags: ["admin"],
        summary: "Change the role of someone else's account",
        params,
        body: changeRoleSchema,
        response: { 200: accountViewSchema, ...errors },
      },
    },
    async (request, reply) => {
      const actor = await authorize(request, reply, signIn, "users.manage");
      if (actor === null) {
        return reply;
      }
      try {
        return await accountAdmin.changeRole(actor.id, request.params.id, request.body.role);
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  const actions = {
    disable: {
      summary: "Disable someone else's account (its sessions end)",
      run: (actorId: string, id: string) => accountAdmin.setDisabled(actorId, id, true),
    },
    enable: {
      summary: "Enable a disabled account again",
      run: (actorId: string, id: string) => accountAdmin.setDisabled(actorId, id, false),
    },
    "reset-second-factor": {
      summary: "Reset the second factor (set up again at the next sign-in)",
      run: (actorId: string, id: string) => accountAdmin.resetSecondFactor(actorId, id),
    },
  } as const;

  for (const [name, action] of Object.entries(actions)) {
    app.post(
      `/accounts/:id/${name}`,
      {
        schema: {
          tags: ["admin"],
          summary: action.summary,
          params,
          response: { 200: accountViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const actor = await authorize(request, reply, signIn, "users.manage");
        if (actor === null) {
          return reply;
        }
        try {
          return await action.run(actor.id, request.params.id);
        } catch (error) {
          return refuse(request, reply, error);
        }
      },
    );
  }

  /** Actions answering with a new activation link (shown once in the console). */
  const linkActions = {
    activation: {
      summary: "A new activation code for an account not activated yet",
      run: (actorId: string, id: string) => accountAdmin.renewActivation(actorId, id),
    },
    "password-reset": {
      summary: "A forgotten password: the old one stops working, a new activation code",
      run: (actorId: string, id: string) => accountAdmin.resetPassword(actorId, id),
    },
  } as const;

  for (const [name, action] of Object.entries(linkActions)) {
    app.post(
      `/accounts/:id/${name}`,
      {
        schema: {
          tags: ["admin"],
          summary: action.summary,
          params,
          response: { 200: activationSchema, ...errors },
        },
      },
      async (request, reply) => {
        const actor = await authorize(request, reply, signIn, "users.manage");
        if (actor === null) {
          return reply;
        }
        try {
          return await action.run(actor.id, request.params.id);
        } catch (error) {
          return refuse(request, reply, error);
        }
      },
    );
  }

  app.post(
    "/auth/activate",
    {
      config: { rateLimit: ACTIVATION_RATE },
      schema: {
        tags: ["admin"],
        summary: "The person of a new account chooses a password with the activation code",
        body: activateAccountSchema,
        response: { 204: z.null(), 401: apiErrorSchema, 422: apiErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        await accountAdmin.activate(request.body.code, request.body.password);
        return await reply.code(204).send(null);
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  return Promise.resolve();
};
