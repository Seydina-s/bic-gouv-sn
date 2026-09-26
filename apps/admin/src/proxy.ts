import { NextResponse, type NextRequest } from "next/server";

/**
 * Quick check before any console page: without a session cookie, straight to the
 * sign-in page. Only an optimistic shortcut: every page still verifies the session
 * with the API (lib/session.ts), which is the real protection.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("bgs_admin_session")) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/connexion", request.url));
}

export const config = {
  // Everything except the sign-in page and Next.js files.
  matcher: ["/((?!connexion|_next/|favicon.ico).*)"],
};
