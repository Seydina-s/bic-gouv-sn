import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/*
 * Accounts of the administration team, managed in the console by administrators
 * (ADM-10). Never a password, a hash or a second-factor secret: only what the
 * team needs to see and decide.
 */

/** Least privilege, lowest first (same order as @bgs/admin-auth). */
export const adminRoleSchema = z.enum(["reviewer", "editor", "admin"]);
export type AdminRole = z.infer<typeof adminRoleSchema>;

/** Where an account stands, in the order a new member goes through. */
export const accountStateSchema = z.enum([
  /** Created: waits for its person to choose a password through the activation link. */
  "invited",
  /** Password chosen; the second factor is set up at the first sign-in. */
  "no-second-factor",
  /** Password and second factor: signs in normally. */
  "active",
  /** Can no longer sign in; its sessions were closed. */
  "disabled",
]);
export type AccountState = z.infer<typeof accountStateSchema>;

export const accountViewSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.string().min(1),
  role: adminRoleSchema,
  state: accountStateSchema,
  createdAt: isoDateTimeSchema,
  /** When the activation link stops working (invited accounts only). */
  activationExpiresAt: isoDateTimeSchema.nullable(),
  /** The activation link no longer works: a new one is needed. */
  activationExpired: z.boolean(),
  /** Blocked for a while after repeated failed sign-ins. */
  locked: z.boolean(),
});
export type AccountView = z.infer<typeof accountViewSchema>;

export const accountsResponseSchema = z.object({
  /** Oldest first: the team as it was built. */
  accounts: z.array(accountViewSchema),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  role: adminRoleSchema,
});

/** A new activation link: the code is shown once, only its fingerprint is kept. */
export const activationSchema = z.object({
  account: accountViewSchema,
  code: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type Activation = z.infer<typeof activationSchema>;

export const changeRoleSchema = z.object({ role: adminRoleSchema });

export const activateAccountSchema = z.object({
  code: z.string().min(1).max(128),
  password: z.string().max(1024),
});
