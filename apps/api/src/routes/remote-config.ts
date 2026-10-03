import type { RemoteConfigStore } from "@bgs/content-store";
import { apiErrorSchema, remoteConfigSchema, type RemoteConfig } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

/** A switched-off feature reaches every phone within a minute. */
const PUBLIC_CACHE = "public, max-age=60";

/**
 * What every installed app reads at start and now and then: which features are on,
 * and the oldest version still allowed. No personal data, the same for everyone.
 */
export const remoteConfigRoutes: FastifyPluginAsyncZod<{ store: RemoteConfigStore }> = (
  app,
  { store },
) => {
  app.get(
    "/remote-config",
    {
      schema: {
        tags: ["config"],
        summary: "Features switched on or off in the apps, and the minimum app version",
        response: { 200: remoteConfigSchema },
      },
    },
    async (_request, reply) => {
      void reply.header("cache-control", PUBLIC_CACHE);
      return store.read();
    },
  );
  return Promise.resolve();
};

export interface AdminRemoteConfigOptions {
  signIn: AdminSignIn;
  journal: AuditJournal;
  store: RemoteConfigStore;
}

/** Plain summary of a change, for the audit journal. */
function summary(config: RemoteConfig): Record<string, string> {
  const off = Object.entries(config.features)
    .filter(([, on]) => !on)
    .map(([feature]) => feature);
  return {
    minVersion: config.minVersion ?? "aucune",
    off: off.length === 0 ? "aucune" : off.join(","),
  };
}

/** The console changes the remote control: admins only, every change journaled. */
export const adminRemoteConfigRoutes: FastifyPluginAsyncZod<AdminRemoteConfigOptions> = (
  app,
  { signIn, journal, store },
) => {
  app.get(
    "/remote-config",
    {
      schema: {
        tags: ["admin"],
        summary: "Current remote control of the apps",
        response: { 200: remoteConfigSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return store.read();
    },
  );

  app.put(
    "/remote-config",
    {
      schema: {
        tags: ["admin"],
        summary: "An admin switches features or sets the minimum app version (journaled)",
        body: remoteConfigSchema,
        response: {
          200: z.object({ saved: z.literal(true) }),
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "flags.manage");
      if (account === null) {
        return reply;
      }
      const saved = await store.write(request.body);
      await journal.append({
        at: new Date().toISOString(),
        actor: account.id,
        action: "remote-config.changed",
        target: "apps",
        details: summary(saved),
      });
      return { saved: true as const };
    },
  );
  return Promise.resolve();
};
