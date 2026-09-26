import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Content Security Policy. Next.js hydrates with inline scripts, hence
 * 'unsafe-inline' for scripts until nonce-based CSP is set up (backlog SEC-03).
 * 'unsafe-eval' only on the local development server (React's debugging tools need
 * it); production never allows it. Everything else is locked to this origin.
 * The phase Next.js passes is used: NODE_ENV is not yet set when this file loads.
 */
function contentSecurityPolicy(isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
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

const securityHeaders = (isDevelopment: boolean) => [
  { key: "Content-Security-Policy", value: contentSecurityPolicy(isDevelopment) },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config = (phase: string): NextConfig => ({
  poweredByHeader: false,
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript sources.
  transpilePackages: ["@bgs/i18n", "@bgs/resilience", "@bgs/shared-types", "@bgs/ui"],
  headers: () =>
    Promise.resolve([
      { source: "/:path*", headers: securityHeaders(phase === PHASE_DEVELOPMENT_SERVER) },
    ]),
});

export default config;
