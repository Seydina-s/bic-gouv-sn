import type { NextConfig } from "next";

/**
 * Content Security Policy. Next.js hydrates with inline scripts, hence
 * 'unsafe-inline' for scripts until nonce-based CSP is set up (backlog SEC-03).
 * 'unsafe-eval' only in local development (React's debugging tools need it);
 * production never allows it. Everything else is locked to this origin.
 */
const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript sources.
  transpilePackages: ["@bgs/i18n", "@bgs/resilience", "@bgs/shared-types", "@bgs/ui"],
  headers: () => Promise.resolve([{ source: "/:path*", headers: securityHeaders }]),
};

export default config;
