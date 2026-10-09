// Real-time watcher: `pnpm --filter @bgs/ingestion watch`. Stops cleanly on Ctrl+C / SIGTERM.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readIngestionStatus,
  removeStaleTemps,
  snapshotDaily,
  writeIngestionStatus,
} from "@bgs/content-store";
import { errorCodeOf } from "@bgs/shared-types";
import { acquireLock } from "../lib/single-instance";
import { openStores } from "../lib/stores";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";
import { NEWS_SOURCES } from "../sources/news-sources";
import { createPrimatureProvider } from "../sources/primature/primature-provider";
import { WORDPRESS_MINISTRIES } from "../sources/wordpress/ministries";

const MINISTRY_IDS = Object.keys(WORDPRESS_MINISTRIES) as (keyof typeof WORDPRESS_MINISTRIES)[];
import { circuitStatuses, nextIngestionStatus, type PassOutcome } from "../status";
import {
  nextPollDelayMs,
  pollSources,
  retryDelayMs,
  SeenIndex,
  watchedFrom,
  type WatchedSource,
} from "../watch";
import { isWithdrawalCheckDue, reconcileWithdrawals } from "../withdrawn";

// Into PostgreSQL when DATABASE_URL is set (SCALE-02), shared with the API; else .data/.
const { stores, inDatabase, paths, close } = await openStores();
const storePath = paths.news;
// The store has a single writer: a second watcher refuses to start (ERREURS.md, 28/09).
const lock = await acquireLock(`${storePath}.watch.lock`);
if (!lock.acquired) {
  process.stdout.write(
    `Another watcher is already running (process ${String(lock.holder)}): not starting a second one.\n`,
  );
  process.exit(1);
}
// Sole writer now: temporary files an interrupted write left behind can go.
const STALE_TEMP_MS = 60 * 60 * 1000;
const staleTemps = await removeStaleTemps(dirname(storePath), STALE_TEMP_MS);
if (staleTemps > 0) {
  process.stdout.write(
    `Removed ${String(staleTemps)} temporary file(s) left by an interrupted write.\n`,
  );
}
const provider = createPresidenceProvider();
// The Présidence at the ordinary pace (freshness SLO < 2 min); the Primature, whose
// site has no feed and publishes a few times a week, every 15 minutes (docs/sources.md).
const sources: WatchedSource[] = watchedFrom(
  [
    {
      institution: "presidence",
      name: "presidence.sn",
      provider,
      langs: ["fr", "wo"],
      everyMs: 0,
      essential: true,
      seen: new SeenIndex(),
      lastPassAt: null,
    },
    {
      institution: "primature",
      name: "primature.sn",
      provider: createPrimatureProvider(),
      langs: ["fr"],
      everyMs: 15 * 60 * 1000,
      essential: false,
      seen: new SeenIndex(),
      lastPassAt: null,
    },
    // Ministry sites: a few posts a week each, read every 30 minutes (docs/sources.md).
    ...MINISTRY_IDS.map((institution): WatchedSource => ({
      institution,
      name: new URL(WORDPRESS_MINISTRIES[institution].origin).hostname,
      provider: NEWS_SOURCES[institution](),
      langs: ["fr"],
      everyMs: 30 * 60 * 1000,
      essential: false,
      seen: new SeenIndex(),
      lastPassAt: null,
    })),
  ],
  process.env["WATCHED_SOURCES"],
);
process.stdout.write(`Watching ${sources.map((source) => source.name).join(", ")}.
`);
const repository = stores.articles;
const media = new FileMediaStorage(
  process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("../../../../.data/media", import.meta.url)),
);

// Mutated from signal handlers: an object so the loop condition is re-read each time.
const control = { running: true };
let wake: (() => void) | null = null;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    control.running = false;
    wake?.();
  });
}

// Report read by the administration console (through the API) after each pass.
const statusPath = paths.ingestionStatus;
const statusDocument = stores.ingestionStatus;
let status = await readIngestionStatus(statusDocument);

// One safety copy of the data files per day, the last 7 kept (DATA-01); a database
// keeps its own backups.
const backupsDir =
  process.env["BACKUPS_DIR"] ??
  fileURLToPath(new URL("../../../../.data/backups", import.meta.url));

/**
 * Records the pass and when the next one happens: the ordinary pace, or spaced
 * retries while the source fails (never a stop). Returns the wait in milliseconds.
 */
async function report(outcome: PassOutcome, lastChangeAt: Date | null): Promise<number> {
  const now = new Date();
  const next = nextIngestionStatus(status, outcome, now);
  const delay =
    next.consecutiveFailures > 0
      ? retryDelayMs(next.consecutiveFailures)
      : nextPollDelayMs(now, lastChangeAt);
  status = {
    ...next,
    nextAttemptAt: new Date(now.getTime() + delay).toISOString(),
    circuits: circuitStatuses(sources.flatMap((source) => source.provider.circuits?.() ?? [])),
  };
  await writeIngestionStatus(statusDocument, status).catch((error: unknown) => {
    process.stdout.write(`status report not written: ${String(error)}\n`);
  });
  if (inDatabase) {
    return delay;
  }
  await snapshotDaily({ files: [storePath, statusPath], backupsDir, now: new Date(), keep: 7 })
    .then((snapshot) => {
      if (snapshot === "created") {
        process.stdout.write(`daily backup written in ${backupsDir}\n`);
      }
    })
    .catch((error: unknown) => {
      process.stdout.write(`daily backup failed: ${String(error)}\n`);
    });
  return delay;
}

// Articles withdrawn by the source are hidden, once a night (ING-03).
let lastWithdrawalCheckAt: Date | null = null;
async function checkWithdrawalsIfDue() {
  const now = new Date();
  if (!isWithdrawalCheckDue(now, lastWithdrawalCheckAt)) {
    return;
  }
  lastWithdrawalCheckAt = now;
  try {
    const { hidden, restored, missing } = await reconcileWithdrawals(
      provider,
      repository,
      ["fr", "wo"],
      { apply: true, now: () => new Date() },
    );
    process.stdout.write(
      `${now.toISOString()} withdrawals checked · ${String(missing.length)} unlisted · newly hidden ${String(hidden)} · shown again ${String(restored)}\n`,
    );
  } catch (error) {
    // Retried the next night; the ordinary passes are not affected.
    process.stdout.write(`${now.toISOString()} ✗ withdrawal check: ${String(error)}\n`);
  }
}

let lastChangeAt: Date | null = null;
while (control.running) {
  const startedAt = new Date();
  let delay: number;
  try {
    const result = await pollSources(sources, repository, () => new Date(), media);
    const { created, updated } = result.outcomes;
    if (created + updated > 0) {
      lastChangeAt = new Date();
      const slowest = Math.max(...result.detectionDelays, 0);
      process.stdout.write(
        `${startedAt.toISOString()} new ${String(created)} · edited ${String(updated)} · slowest detection ${slowest.toFixed(0)} s\n`,
      );
    }
    delay = await report({ result }, lastChangeAt);
    for (const failure of result.failures) {
      process.stdout.write(`${startedAt.toISOString()} ✗ ${failure.code} ${failure.ref}\n`);
    }
    await checkWithdrawalsIfDue();
  } catch (error) {
    delay = await report({ error: { code: errorCodeOf(error) ?? "UNKNOWN" } }, lastChangeAt);
    process.stdout.write(
      `${startedAt.toISOString()} ✗ ${error instanceof Error ? error.message : String(error)} · next try in ${String(Math.round(delay / 1000))} s\n`,
    );
  }
  await new Promise<void>((resolve) => {
    wake = resolve;
    setTimeout(resolve, delay);
  });
}
await lock.release();
await close();
process.stdout.write("Watcher stopped.\n");
