// Reads the newest articles aloud with our voices (Jessica in French, Adia in Wolof)
// and attaches the recordings: `pnpm --filter @bgs/api voices:record [--lang fr|wo]
// [--limit 20]`. Runs the voices on the voice server when VOICES_SSH_HOST
// ("voices@<address>") and VOICES_SSH_KEY (key file) are set, otherwise here with uv
// (services/voices). Messages are in French: this command is run by the team. Safe to
// stop and run again: what is recorded stays recorded.
import { fileURLToPath } from "node:url";
import { contentStores } from "@bgs/content-store";
import { openDatabase } from "@bgs/database";
import type { Lang } from "@bgs/shared-types";
import { loadConfig } from "../config";
import { resolveDataPath } from "../data-path";
import { pythonSynthesizer } from "../voices/python-synthesizer";
import { remoteSynthesizer } from "../voices/remote-synthesizer";
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
const serverHost = process.env["VOICES_SSH_HOST"];
const serverKey = process.env["VOICES_SSH_KEY"];
const onServer = serverHost !== undefined && serverKey !== undefined;

try {
  const todo = recordingsToMake(await allArticles(articles), langs, limit);
  say(
    `Enregistrements à faire : ${String(todo.length)}${onServer ? " (sur le serveur des voix)" : ""}`,
  );
  const report = await record(todo, {
    articles,
    mediaRoot: config.MEDIA_ROOT,
    synthesize: onServer
      ? remoteSynthesizer({ host: serverHost, keyPath: serverKey })
      : pythonSynthesizer({
          project: fileURLToPath(new URL("../../../../services/voices", import.meta.url)),
          models: resolveDataPath(".data/voices"),
          uv: process.env["UV_PATH"] ?? "uv",
        }),
    // A Wolof reading takes about 20 minutes: one per group, so a cut connection
    // loses one recording, never ten.
    groupSize: lang === "wo" ? 1 : 10,
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
