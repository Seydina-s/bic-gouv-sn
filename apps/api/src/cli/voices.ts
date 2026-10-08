// Reads the newest articles aloud with our voices (Jessica in French, Adia in Wolof)
// and attaches the recordings: `pnpm --filter @bgs/api voices:record [--lang fr|wo]
// [--limit 20]`. Needs uv (services/voices). Messages are in French: this command is
// run by the team. Safe to stop and run again: what is recorded stays recorded.
import { fileURLToPath } from "node:url";
import { contentStores } from "@bgs/content-store";
import { openDatabase } from "@bgs/database";
import type { Lang } from "@bgs/shared-types";
import { loadConfig } from "../config";
import { resolveDataPath } from "../data-path";
import { pythonSynthesizer } from "../voices/python-synthesizer";
import { allArticles, record, recordingsToMake } from "../voices/recordings";

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : (process.argv[index + 1] ?? null);
}

const lang = option("--lang");
const limit = Number(option("--limit") ?? "20");
if (lang !== null && lang !== "fr" && lang !== "wo") {
  throw new Error("--lang attend fr ou wo");
}
if (!Number.isInteger(limit) || limit < 1) {
  throw new Error("--limit attend un nombre entier positif");
}
const langs: Lang[] = lang === null ? ["fr", "wo"] : [lang];

const config = loadConfig(process.env);
const database = await openDatabase(config.DATABASE_URL);
const { articles } = contentStores(database, {
  news: config.NEWS_STORE_PATH,
  procedures: config.PROCEDURES_STORE_PATH,
  procedureThemes: config.PROCEDURE_THEMES_PATH,
  stateServices: config.STATE_SERVICES_PATH,
  remoteConfig: config.REMOTE_CONFIG_PATH,
  ingestionStatus: config.INGESTION_STATUS_PATH,
});
const say = (line: string) => process.stdout.write(`${line}\n`);

try {
  const todo = recordingsToMake(await allArticles(articles), langs, limit);
  say(`Enregistrements à faire : ${String(todo.length)}`);
  const report = await record(todo, {
    articles,
    mediaRoot: config.MEDIA_ROOT,
    synthesize: pythonSynthesizer({
      project: fileURLToPath(new URL("../../../../services/voices", import.meta.url)),
      models: resolveDataPath(".data/voices"),
      uv: process.env["UV_PATH"] ?? "uv",
    }),
    onProgress: (done, total) => {
      say(`  ${String(done)} / ${String(total)}`);
    },
  });
  say(
    `Enregistrés : ${String(report.recorded)} (${String(Math.round(report.audioMs / 60_000))} min d'écoute)`,
  );
  for (const failure of report.failed) {
    say(`  Échec ${failure.lang} ${failure.id} : ${failure.error}`);
  }
} finally {
  await database?.close();
}
