import type { NextConfig } from "next";

/**
 * Security headers of every response. The Content Security Policy is set per
 * request by the proxy (src/proxy.ts), with a fresh nonce for the page's scripts.
 */
const securityHeaders = [
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
