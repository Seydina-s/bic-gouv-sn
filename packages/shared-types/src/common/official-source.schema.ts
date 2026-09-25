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
