// Real-time watcher: `pnpm --filter @bgs/ingestion watch`. Stops cleanly on Ctrl+C / SIGTERM.
import { fileURLToPath } from "node:url";
import {
  FileArticleRepository,
  readIngestionStatus,
  writeIngestionStatus,
} from "@bgs/content-store";
import { errorCodeOf } from "@bgs/shared-types";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";
import { nextIngestionStatus, type PassOutcome } from "../status";
import { nextPollDelayMs, pollOnce, SeenIndex } from "../watch";

const storePath =
  process.env["NEWS_STORE_PATH"] ??
  fileURLToPath(new URL("../../../../.data/news.json", import.meta.url));
const provider = createPresidenceProvider();
const repository = new FileArticleRepository(storePath);
const media = new FileMediaStorage(
  process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("../../../../.data/media", import.meta.url)),
);
const seen = new SeenIndex();

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
const statusPath =
  process.env["INGESTION_STATUS_PATH"] ??
  fileURLToPath(new URL("../../../../.data/ingestion-status.json", import.meta.url));
let status = await readIngestionStatus(statusPath);

async function report(outcome: PassOutcome) {
  status = nextIngestionStatus(status, outcome, new Date());
  await writeIngestionStatus(statusPath, status).catch((error: unknown) => {
    process.stdout.write(`status report not written: ${String(error)}\n`);
  });
}

let lastChangeAt: Date | null = null;
while (control.running) {
  const startedAt = new Date();
  try {
    const result = await pollOnce(
      provider,
      repository,
      ["fr", "wo"],
      seen,
      () => new Date(),
      media,
    );
    const { created, updated } = result.outcomes;
    if (created + updated > 0) {
      lastChangeAt = new Date();
      const slowest = Math.max(...result.detectionDelays, 0);
      process.stdout.write(
        `${startedAt.toISOString()} new ${String(created)} · edited ${String(updated)} · slowest detection ${slowest.toFixed(0)} s\n`,
      );
    }
    await report({ result });
    for (const failure of result.failures) {
      process.stdout.write(`${startedAt.toISOString()} ✗ ${failure.code} ${failure.ref}\n`);
    }
  } catch (error) {
    await report({ error: { code: errorCodeOf(error) ?? "UNKNOWN" } });
    process.stdout.write(
      `${startedAt.toISOString()} ✗ ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
  await new Promise<void>((resolve) => {
    wake = resolve;
    setTimeout(resolve, nextPollDelayMs(new Date(), lastChangeAt));
  });
}
process.stdout.write("Watcher stopped.\n");
