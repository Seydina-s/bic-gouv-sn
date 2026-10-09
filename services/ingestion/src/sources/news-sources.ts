import { institutionSchema, type Institution } from "@bgs/shared-types";
import { createPresidenceProvider } from "./presidence/presidence-provider";
import { createPrimatureProvider } from "./primature/primature-provider";
import type { SourceProvider } from "./source-provider";

/** The collector of each institution's news (docs/sources.md). */
export const NEWS_SOURCES: Readonly<Record<Institution, () => SourceProvider>> = {
  presidence: createPresidenceProvider,
  primature: createPrimatureProvider,
};

/** The institution named by `--source <id>` in a command, presidence.sn by default. */
export function sourceOption(argv: readonly string[]): Institution {
  const index = argv.indexOf("--source");
  return index < 0 ? "presidence" : institutionSchema.parse(argv[index + 1]);
}
