// Validates by default the state services still waiting (owner's decision of
// 14/10/2026), all but those named like a company: `pnpm --filter @bgs/ingestion
// services:validate`. Run once; new imports are validated by default themselves.
import { openStores } from "../lib/stores";

const { stores, close } = await openStores();
try {
  const validated = await stores.stateServices.validateWaiting(new Date().toISOString());
  process.stdout.write(`${String(validated)} services validés par défaut.
`);
} finally {
  await close();
}
