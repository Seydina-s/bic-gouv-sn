// The backlog's open tasks only (CLAUDE.md §5): the latest row of each task wins, and
// those done or abandoned are left out. Read this instead of the whole backlog.md.
//   pnpm backlog:open            every open task, one line each
//   pnpm backlog:open -- --full  the whole row instead of its first 230 characters
import { readFileSync } from "node:fs";

const full = process.argv.includes("--full");
const rows = readFileSync(new URL("../backlog.md", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line.startsWith("| "));
const latest = new Map();
for (const row of rows) {
  const match = row.match(/^\| [^|]+ \| ([A-Z][A-Z0-9]*-[0-9A-Z]+) (🔴|🔵|✅|⏸|❌)/u);
  if (match) {
    latest.set(match[1], { state: match[2], row: full ? row : row.slice(0, 230) });
  }
}
const open = [...latest.values()].filter(({ state }) => state !== "✅" && state !== "❌");
for (const { state, row } of open) {
  process.stdout.write(`${state} ${row}\n`);
}
process.stdout.write(`${String(open.length)} tâches ouvertes sur ${String(latest.size)}\n`);
