import { institutionSchema, type Institution } from "@bgs/shared-types";
import { createDrupalProvider } from "./drupal/drupal-provider";
import { DRUPAL_MINISTRIES } from "./drupal/ministries";
import { createInterieurProvider } from "./interieur/interieur-provider";
import { createMesriProvider } from "./mesri/mesri-provider";
import { createPresidenceProvider } from "./presidence/presidence-provider";
import { createPrimatureProvider } from "./primature/primature-provider";
import type { SourceProvider } from "./source-provider";
import { WORDPRESS_MINISTRIES } from "./wordpress/ministries";
import { createWordpressProvider } from "./wordpress/wordpress-provider";

/** The collector of each institution's news (docs/sources.md). */
export const NEWS_SOURCES: Readonly<Record<Institution, () => SourceProvider>> = {
  presidence: createPresidenceProvider,
  primature: createPrimatureProvider,
  justice: () => createWordpressProvider(WORDPRESS_MINISTRIES.justice),
  "industrie-commerce": () => createWordpressProvider(WORDPRESS_MINISTRIES["industrie-commerce"]),
  energie: () => createWordpressProvider(WORDPRESS_MINISTRIES.energie),
  hydraulique: () => createWordpressProvider(WORDPRESS_MINISTRIES.hydraulique),
  agriculture: () => createWordpressProvider(WORDPRESS_MINISTRIES.agriculture),
  peches: () => createWordpressProvider(WORDPRESS_MINISTRIES.peches),
  culture: () => createWordpressProvider(WORDPRESS_MINISTRIES.culture),
  "enseignement-superieur": createMesriProvider,
  interieur: createInterieurProvider,
  sante: () => createDrupalProvider(DRUPAL_MINISTRIES.sante),
  "forces-armees": () => createDrupalProvider(DRUPAL_MINISTRIES["forces-armees"]),
  "emploi-formation": () => createWordpressProvider(WORDPRESS_MINISTRIES["emploi-formation"]),
};

/** One provider per institution, each with its own pace and circuit breaker. */
export function createNewsProviders(): Record<Institution, SourceProvider> {
  return Object.fromEntries(
    Object.entries(NEWS_SOURCES).map(([id, create]) => [id, create()]),
  ) as Record<Institution, SourceProvider>;
}

/** Command arguments without `--source <id>`, in order. */
export function positionalArguments(argv: readonly string[]): string[] {
  return argv
    .slice(2)
    .filter((arg, index, all) => !arg.startsWith("--") && all[index - 1] !== "--source");
}

/** The institution named by `--source <id>` in a command, presidence.sn by default. */
export function sourceOption(argv: readonly string[]): Institution {
  const index = argv.indexOf("--source");
  return index < 0 ? "presidence" : institutionSchema.parse(argv[index + 1]);
}
