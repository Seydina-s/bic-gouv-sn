import { z } from "zod";

/*
 * The institutions of the Government whose official news the platform relays
 * (CLAUDE.md §1, "Sources de vérité", whole-government scope of 09/10/2026). A
 * ministry is added here only with its collector, once its site is verified in
 * docs/sources.md. Names shown to people live in the i18n messages, not here.
 */

export const INSTITUTIONS = ["presidence", "primature"] as const;

export const institutionSchema = z.enum(INSTITUTIONS);
export type Institution = z.infer<typeof institutionSchema>;

/**
 * The reference institution: when the same content is published by several
 * institutions, its version is the one kept (owner's decision of 09/10/2026).
 */
export const REFERENCE_INSTITUTION: Institution = "presidence";

interface InstitutionSite {
  /** Hosts of the institution's public pages (an article's `sourceUrl`). */
  pageHosts: readonly string[];
  /** Hosts serving its official photos and documents. */
  mediaHosts: readonly string[];
}

export const INSTITUTION_SITES: Readonly<Record<Institution, InstitutionSite>> = {
  presidence: {
    pageHosts: ["presidence.sn", "www.presidence.sn"],
    mediaHosts: ["presidence.sn", "www.presidence.sn", "bo-admin.presidence.sn"],
  },
  primature: {
    pageHosts: ["primature.sn", "www.primature.sn"],
    mediaHosts: ["primature.sn", "www.primature.sn"],
  },
};

/** Institution publishing at this address, or null when it is none of them. Never throws. */
export function institutionOfUrl(url: string): Institution | null {
  try {
    const host = new URL(url).hostname;
    return INSTITUTIONS.find((id) => INSTITUTION_SITES[id].pageHosts.includes(host)) ?? null;
  } catch {
    return null;
  }
}
