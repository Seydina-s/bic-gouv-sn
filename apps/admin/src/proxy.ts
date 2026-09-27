import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bgs_admin_session";
const SIGN_IN = "/connexion";

/**
 * Content Security Policy with a fresh nonce per request (SEC-03): only the scripts
 * Next.js renders with that nonce run, and the ones they load ('strict-dynamic');
 * a script slipped into a page never does. 'unsafe-eval' only on the local
 * development server (React's debugging tools). Styles keep 'unsafe-inline': the
 * theme and the fonts are style tags, and a style runs no code.
 */
export function contentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function isSignIn(pathname: string): boolean {
  return pathname === SIGN_IN || pathname.startsWith(`${SIGN_IN}/`);
}

/**
 * Before every console page: a fresh nonce for its scripts and, without a session
 * cookie, the sign-in page. The cookie check is only an optimistic shortcut: every
 * page still verifies the session with the API (lib/session.ts).
 */
export function proxy(request: NextRequest) {
  if (!isSignIn(request.nextUrl.pathname) && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(SIGN_IN, request.url));
  }
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  // Next.js reads the nonce from the request's policy and puts it on its scripts.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Every page, the sign-in page included; not Next.js's own files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
