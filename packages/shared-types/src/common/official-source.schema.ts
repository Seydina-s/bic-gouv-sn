import { httpsUrlSchema } from "./primitives.schema";

/** The only hosts allowed as content sources (CLAUDE.md §1, "Sources de vérité"). */
export const OFFICIAL_SOURCE_HOSTS = [
  "presidence.sn",
  "www.presidence.sn",
  "e-senegal.sn",
  "www.e-senegal.sn",
] as const;

const officialHosts: ReadonlySet<string> = new Set(OFFICIAL_SOURCE_HOSTS);

/**
 * Never throws: Zod still runs this check when the URL format check has already failed.
 * Uses try/catch rather than URL.parse, which the mobile JS engine (Hermes) may lack.
 */
export function isOfficialSourceUrl(url: string): boolean {
  try {
    return officialHosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const officialSourceUrlSchema = httpsUrlSchema.refine(isOfficialSourceUrl, {
  message: "URL must belong to an official source (presidence.sn or e-senegal.sn)",
});

/** Hosts serving the official media (photos, documents) of the content sources. */
const OFFICIAL_MEDIA_HOSTS: ReadonlySet<string> = new Set([
  "presidence.sn",
  "www.presidence.sn",
  "bo-admin.presidence.sn",
]);

/**
 * Former media host of presidence.sn: its TLS certificate is invalid (never bypassed),
 * and the same files are served unchanged by the current back office.
 */
const LEGACY_MEDIA_HOSTS: Readonly<Record<string, string>> = {
  "bo.presidence.sn": "bo-admin.presidence.sn",
};

/**
 * Canonical URL of an official media file, or null when the file is not hosted by an
 * official source (e.g. images pasted from social networks: never loaded, they would
 * expose readers to third parties). Collapses the doubled slashes the source emits.
 * Never throws.
 */
export function officialMediaUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.hostname = LEGACY_MEDIA_HOSTS[parsed.hostname] ?? parsed.hostname;
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    return parsed.protocol === "https:" && OFFICIAL_MEDIA_HOSTS.has(parsed.hostname)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
