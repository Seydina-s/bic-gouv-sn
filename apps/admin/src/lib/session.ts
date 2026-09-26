import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { adminRequest } from "./admin-api";

/** Session token: unreadable by the page's scripts, sent to this site only. */
export const SESSION_COOKIE = "bgs_admin_session";
/** Between the password and the code (5 minutes at most on the API side). */
export const CHALLENGE_COOKIE = "bgs_admin_challenge";

const COOKIE = { httpOnly: true, secure: true, sameSite: "strict", path: "/" } as const;

export const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["reviewer", "editor", "admin"]),
});
export type Account = z.infer<typeof accountSchema>;

export async function setSessionCookie(token: string): Promise<void> {
  // The API ends a session after 8 h at most; the cookie never outlives it.
  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE, maxAge: 8 * 60 * 60 });
}

export async function setChallengeCookie(challenge: string): Promise<void> {
  (await cookies()).set(CHALLENGE_COOKIE, challenge, { ...COOKIE, maxAge: 5 * 60 });
}

export async function readCookie(name: string): Promise<string | null> {
  return (await cookies()).get(name)?.value ?? null;
}

export async function clearCookie(name: string): Promise<void> {
  (await cookies()).delete(name);
}

/** The signed-in account, checked with the API once per request; null when signed out. */
export const currentAccount = cache(async (): Promise<Account | null> => {
  const token = await readCookie(SESSION_COOKIE);
  if (token === null) {
    return null;
  }
  const me = await adminRequest({ path: "/auth/me", token, schema: accountSchema });
  return me.ok ? me.data : null;
});

/** Every console page starts here: signed out (or expired) people go to the sign-in page. */
export async function requireAccount(): Promise<{ account: Account; token: string }> {
  const account = await currentAccount();
  const token = await readCookie(SESSION_COOKIE);
  if (account === null || token === null) {
    redirect("/connexion");
  }
  return { account, token };
}
