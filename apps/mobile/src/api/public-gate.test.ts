import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * The phones reach the API through the public gate (scripts/public-gate.mjs), which
 * lets through only the paths it lists. "Entreprendre" (DER-01) was added to the app
 * and not to the gate: the section vanished from the front page for every tester,
 * while it showed on a computer talking to the API directly (17/10/2026).
 */

const repo = join(__dirname, "../../../..");

/** The path prefixes the gate lets through. */
function gatePrefixes(): string[] {
  const gate = readFileSync(join(repo, "scripts/public-gate.mjs"), "utf8");
  const list = gate.slice(
    gate.indexOf("const ALLOWED = ["),
    gate.indexOf("];", gate.indexOf("const ALLOWED")),
  );
  return [...list.matchAll(/\["[A-Z]+", "([^"]+)"\]/g)].map((match) => match[1] ?? "");
}

/** Every API path the app's clients call, up to the first variable part. */
function appPaths(): string[] {
  const dir = join(repo, "apps/mobile/src/api");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .flatMap((file) => [...readFileSync(join(dir, file), "utf8").matchAll(/["`](\/v1\/[a-z/-]*)/g)])
    .map((match) => match[1] ?? "");
}

describe("the public gate", () => {
  it("lets through every path the app calls", () => {
    const prefixes = gatePrefixes();
    const refused = appPaths().filter(
      (path) => !prefixes.some((prefix) => path === prefix || path.startsWith(prefix)),
    );
    expect(appPaths().length).toBeGreaterThan(5);
    expect(refused).toEqual([]);
  });
});
