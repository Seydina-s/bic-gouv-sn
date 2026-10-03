// Procedures of e-senegal.sn: `pnpm --filter @bgs/ingestion procedures [maxPages]`.
// Idempotent: unchanged procedures are left as is. ~1 request per second.
// Into PostgreSQL when DATABASE_URL is set, else into .data/procedures.json.
import { openStores } from "../lib/stores";
import { createEsenegalProvider } from "../sources/esenegal/esenegal-provider";
import { importProcedures } from "../sources/esenegal/import-procedures";

const maxPages = process.argv[2] === undefined ? undefined : Number(process.argv[2]);
const { stores, close } = await openStores();

try {
  const result = await importProcedures(createEsenegalProvider(), stores.procedures, {
    ...(maxPages === undefined ? {} : { maxPages }),
    onPage: (p) => {
      const o = p.outcomes;
      process.stdout.write(
        `page ${String(p.page)}/${String(p.pageCount)} · created ${String(o.created)} · updated ${String(o.updated)} · unchanged ${String(o.unchanged)} · failed ${String(p.failures.length)}\n`,
      );
    },
  });
  for (const failure of result.failures) {
    process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
  }
  process.exitCode = result.failures.length > 0 ? 1 : 0;
} finally {
  await close();
}
