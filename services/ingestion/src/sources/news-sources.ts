import { institutionSchema, type Institution } from "@bgs/shared-types";
import { createPresidenceProvider } from "./presidence/presidence-provider";
import { createPrimatureProvider } from "./primature/primature-provider";
import type { SourceProvider } from "./source-provider";

/** The collector of each institution's news (docs/sources.md). */
export const NEWS_SOURCES: Readonly<Record<Institution, () => SourceProvider>> = {
  presidence: createPresidenceProvider,
  primature: createPrimatureProvider,
};

/** One provider per institution, each with its own pace and circuit breaker. */
export function createNewsProviders(): Record<Institution, SourceProvider> {
  return { presidence: NEWS_SOURCES.presidence(), primature: NEWS_SOURCES.primature() };
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
