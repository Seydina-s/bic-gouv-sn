import { can, type Permission } from "@bgs/admin-auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminSignIn, SignedInAccount } from "../admin/sign-in-service";

/** Session token sent by the console's server (Authorization: Bearer <token>). */
export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{20,})$/.exec(header);
  return match?.[1] ?? null;
}

/**
 * The signed-in account when it holds the permission; otherwise answers 401 (no
 * valid session) or 403 (role too low) and returns null. Every admin route calls it.
 */
export async function authorize(
  request: FastifyRequest,
  reply: FastifyReply,
  signIn: AdminSignIn,
  permission: Permission,
): Promise<SignedInAccount | null> {
  const token = bearerToken(request);
  const account = token === null ? null : await signIn.whoIs(token);
  if (account === null) {
    await reply
      .code(401)
      .send({ code: "ADMIN_SESSION_EXPIRED", message: "Not signed in", requestId: request.id });
    return null;
  }
  if (!can(account.role, permission)) {
    await reply
      .code(403)
      .send({ code: "ADMIN_FORBIDDEN", message: "Not allowed", requestId: request.id });
    return null;
  }
  return account;
}
