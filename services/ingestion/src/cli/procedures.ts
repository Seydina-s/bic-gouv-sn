// Procedures of e-senegal.sn: `pnpm --filter @bgs/ingestion procedures [maxPages]`.
// Idempotent: unchanged procedures are left as is. ~1 request per second.
import { fileURLToPath } from "node:url";
import { FileProcedureRepository } from "@bgs/content-store";
import { createEsenegalProvider } from "../sources/esenegal/esenegal-provider";
import { importProcedures } from "../sources/esenegal/import-procedures";

const maxPages = process.argv[2] === undefined ? undefined : Number(process.argv[2]);
const storePath =
  process.env["PROCEDURES_STORE_PATH"] ??
  fileURLToPath(new URL("../../../../.data/procedures.json", import.meta.url));

const result = await importProcedures(
  createEsenegalProvider(),
  new FileProcedureRepository(storePath),
  {
    ...(maxPages === undefined ? {} : { maxPages }),
    onPage: (p) => {
      const o = p.outcomes;
      process.stdout.write(
        `page ${String(p.page)}/${String(p.pageCount)} · created ${String(o.created)} · updated ${String(o.updated)} · unchanged ${String(o.unchanged)} · failed ${String(p.failures.length)}\n`,
      );
    },
  },
);

for (const failure of result.failures) {
  process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
}
process.exitCode = result.failures.length > 0 ? 1 : 0;
