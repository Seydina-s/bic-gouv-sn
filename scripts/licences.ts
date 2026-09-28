// Open-source notices of the app (LIC-01): the packages really shipped in the app,
// read from the source map of a production export (not the whole dependency tree,
// which is mostly build tools), each with its licence and copyright lines. Every
// distinct licence text is kept once.
//   pnpm notices      regenerate apps/mobile/src/features/licences/open-source.json
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const app = join(repo, "apps", "mobile");
const target = join(app, "src", "features", "licences", "open-source.json");
const LICENCE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "license", "license.md"];
/** A copyright line starts with it; "The above copyright notice…" is licence text. */
const COPYRIGHT = /^\s*(?:copyright\b|\(c\)|©)/i;

interface Manifest {
  version?: string;
  license?: string | { type?: string };
  author?: string | { name?: string };
  homepage?: string;
  repository?: string | { url?: string };
}

export interface OpenSourcePackage {
  name: string;
  version: string;
  licence: string;
  copyright: string[];
  url: string | null;
  /** Index of the licence text in `texts`. */
  text: number;
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** Package name → folder, for every module of the app's JavaScript bundle. */
function shippedPackages(exportDir: string): Map<string, string> {
  const folders = new Map<string, string>();
  for (const file of filesUnder(exportDir).filter((path) => path.endsWith(".map"))) {
    const { sources } = JSON.parse(readFileSync(file, "utf8")) as { sources: string[] };
    for (const source of sources) {
      const path = source.replaceAll("\\", "/");
      const at = path.lastIndexOf("/node_modules/");
      if (at < 0) {
        continue;
      }
      const [scope = "", rest = ""] = path.slice(at + "/node_modules/".length).split("/");
      const name = scope.startsWith("@") ? `${scope}/${rest}` : scope;
      if (name !== "" && name !== ".pnpm") {
        folders.set(name, join(repo, path.slice(0, at + "/node_modules/".length) + name));
      }
    }
  }
  return folders;
}

function textOf(manifest: Manifest): string {
  return typeof manifest.license === "string" ? manifest.license : (manifest.license?.type ?? "");
}

function urlOf(name: string, manifest: Manifest): string | null {
  const repository =
    typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
  const raw = manifest.homepage ?? repository;
  if (raw === undefined) {
    return `https://www.npmjs.com/package/${name}`;
  }
  const url = raw
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^git:\/\//, "https://");
  return url.startsWith("https://") ? url : `https://www.npmjs.com/package/${name}`;
}

function authorOf(manifest: Manifest): string | null {
  const author = typeof manifest.author === "string" ? manifest.author : manifest.author?.name;
  return author === undefined || author === "" ? null : author.replace(/\s*[<(].*$/, "");
}

function main(): void {
  const exportDir = mkdtempSync(join(tmpdir(), "bgs-licences-"));
  try {
    // One command line (npx needs a shell on Windows); the folder is ours, from mkdtemp.
    const run = spawnSync(`npx expo export -p android --source-maps --output-dir "${exportDir}"`, {
      cwd: app,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, EXPO_PUBLIC_API_URL: "" },
    });
    if (run.status !== 0) {
      throw new Error("expo export failed");
    }
    const texts: string[] = [];
    const byLicence = new Map<string, number>();
    const pending: { item: Omit<OpenSourcePackage, "text">; body: string | null }[] = [];
    for (const [name, folder] of [...shippedPackages(exportDir)].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as Manifest;
      const file = LICENCE_FILES.map((candidate) => join(folder, candidate)).find(existsSync);
      const lines = file === undefined ? [] : readFileSync(file, "utf8").split(/\r?\n/);
      const copyright = lines.filter((line) => COPYRIGHT.test(line)).map((line) => line.trim());
      const author = authorOf(manifest);
      const body =
        file === undefined
          ? null
          : lines
              .filter((line) => !COPYRIGHT.test(line))
              .join("\n")
              .trim();
      pending.push({
        item: {
          name,
          version: manifest.version ?? "",
          licence: textOf(manifest),
          copyright: copyright.length > 0 || author === null ? copyright : [`© ${author}`],
          url: urlOf(name, manifest),
        },
        body,
      });
    }
    const packages: OpenSourcePackage[] = [];
    // Texts found in the packages first; a package without its own file takes the
    // first text of the same licence.
    for (const { item, body } of pending) {
      if (body === null) {
        continue;
      }
      let index = texts.indexOf(body);
      if (index < 0) {
        index = texts.push(body) - 1;
      }
      if (!byLicence.has(item.licence)) {
        byLicence.set(item.licence, index);
      }
      packages.push({ ...item, text: index });
    }
    for (const { item, body } of pending) {
      if (body !== null) {
        continue;
      }
      const index = byLicence.get(item.licence);
      if (index === undefined) {
        throw new Error(`${item.name}: no licence text for ${item.licence}`);
      }
      packages.push({ ...item, text: index });
    }
    packages.sort((a, b) => a.name.localeCompare(b.name));
    writeFileSync(target, `${JSON.stringify({ packages, texts }, null, 2)}\n`);
    process.stdout.write(`${String(packages.length)} packages, ${String(texts.length)} texts\n`);
  } finally {
    rmSync(exportDir, { recursive: true, force: true });
  }
}

// No top-level await: the root package is CommonJS.
try {
  main();
} catch (error: unknown) {
  process.stdout.write(`Licences: ${String(error)}\n`);
  process.exit(1);
}
