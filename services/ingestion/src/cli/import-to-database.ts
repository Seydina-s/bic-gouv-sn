// Copies the contents of the .data/ files into PostgreSQL, once, before switching
// the API and the collection to the database (SCALE-02):
//   DATABASE_URL=… pnpm --filter @bgs/ingestion content:import
// Safe to run again: nothing already in the database is changed; the files are only
// read. Messages are in French: this command is run by the team.
import { openDatabase } from "@bgs/database";
import { importToDatabase } from "../import-to-database";
import { contentPaths } from "../lib/stores";

const database = await openDatabase(process.env["DATABASE_URL"]);
if (database === null) {
  process.stderr.write("DATABASE_URL n'est pas réglée : aucune base où recopier les contenus.\n");
  process.exit(1);
}
try {
  const report = await importToDatabase(database, contentPaths());
  const documents = Object.entries(report.documents)
    .map(([name, outcome]) => `${name} : ${outcome}`)
    .join(", ");
  process.stdout.write(
    [
      `Articles : ${String(report.articles.imported)} recopiés, ${String(report.articles.present)} déjà en base.`,
      `Démarches : ${String(report.procedures.imported)} recopiées, ${String(report.procedures.present)} déjà en base.`,
      `Documents : ${documents}.`,
      "",
    ].join("\n"),
  );
} finally {
  await database.close();
}
