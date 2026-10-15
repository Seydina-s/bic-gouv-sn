// Reads the "Entreprendre" space from der.sn (DER-01): `pnpm --filter @bgs/ingestion
// entreprendre`. The watcher also does it every 6 hours. Messages are in French.
import { collectEntreprendre, createDerSource } from "../sources/der/der-collector";
import { openStores } from "../lib/stores";

const { document, close } = await openStores();
try {
  const report = await collectEntreprendre(document("entreprendre"), createDerSource());
  process.stdout.write(
    `Pages nouvelles : ${String(report.created.length)} · modifiées : ${String(report.updated.length)} · inchangées : ${String(report.unchanged.length)} · gardées telles quelles : ${report.kept.map(({ slug, reason }) => `${slug} (${reason})`).join(", ") || "aucune"} · actualités : ${report.news === null ? `illisibles (${report.newsError ?? "?"})` : String(report.news)}
`,
  );
} finally {
  await close();
}
