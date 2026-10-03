// Applies the reviewed classification of procedures (data/procedure-classification.json)
// to the theme store: `pnpm --filter @bgs/api procedures:classify`. Idempotent. What a
// person validated in the console is never replaced; every theme batch is journaled.
// Messages are in French: this command is run by the team.
import { readFile } from "node:fs/promises";
import {
  CONTENT_DOCUMENTS,
  ProcedureThemeStore,
  fileDocument,
  postgresDocument,
} from "@bgs/content-store";
import { openDatabase, type Database } from "@bgs/database";
import { z } from "zod";
import { adminStoresForCommand } from "../admin/admin-stores";
import { loadConfig, type Config } from "../config";

/** Who the classification is attributed to, in the store and the audit journal. */
export const DELEGATED_REVIEWER = "delegation:claude";

const classificationSchema = z.object({
  classifiedBy: z.string().min(1),
  method: z.string().min(1),
  platformThemes: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9]+$/),
      title: z.string().min(1),
      sourceIcon: z.string().nullable(),
    }),
  ),
  assignments: z.record(z.string().min(1), z.string().min(1)),
});

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const raw: unknown = JSON.parse(
    await readFile(new URL("../../data/procedure-classification.json", import.meta.url), "utf8"),
  );
  const classification = classificationSchema.parse(raw);
  const database = await openDatabase(config.DATABASE_URL);
  try {
    await classify(classification, themeStore(database, config.PROCEDURE_THEMES_PATH), config);
  } finally {
    await database?.close();
  }
}

/** The themes in PostgreSQL when DATABASE_URL is set (SCALE-02), else in their file. */
function themeStore(database: Database | null, path: string): ProcedureThemeStore {
  return new ProcedureThemeStore(
    database === null
      ? fileDocument(path)
      : postgresDocument(database, CONTENT_DOCUMENTS.procedureThemes),
  );
}

async function classify(
  classification: z.infer<typeof classificationSchema>,
  store: ProcedureThemeStore,
  config: Config,
): Promise<void> {
  const now = new Date().toISOString();

  await store.savePlatformThemes(
    classification.platformThemes.map((theme) => ({ ...theme, fetchedAt: now })),
  );
  const { applied, keptPersonal } = await store.applyClassification(
    classification.assignments,
    DELEGATED_REVIEWER,
    now,
  );

  const perTheme = new Map<string, string[]>();
  for (const slug of applied) {
    const themeId = classification.assignments[slug] ?? "";
    perTheme.set(themeId, [...(perTheme.get(themeId) ?? []), slug]);
  }
  const stores = await adminStoresForCommand(config);
  try {
    for (const [themeId, slugs] of perTheme) {
      await stores.journal.append({
        at: now,
        actor: DELEGATED_REVIEWER,
        action: "procedure.theme.validated",
        target: themeId,
        details: { count: slugs.length, source: "data/procedure-classification.json" },
      });
    }
  } finally {
    await stores.close();
  }
  process.stdout.write(
    `${String(applied.length)} démarches classées, ${String(keptPersonal.length)} classements faits par une personne conservés.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
