// The test browser removes its Chrome profile when it closes (about 90 MB each): until
// 25/10/2026 every audit and journey left one in the temporary folder, 16 at once on
// the development computer. Run in CI after the journeys: fails if a profile is left.
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { TestBrowser } from "./test-browser";

const say = (line: string) => process.stdout.write(`${line}\n`);

function profiles(): Set<string> {
  return new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("bgs-test-chrome-")));
}

async function main(): Promise<number> {
  const before = profiles();
  const browser = await TestBrowser.launch();
  const created = [...profiles()].filter((name) => !before.has(name));
  await browser.close();
  const left = [...profiles()].filter((name) => !before.has(name));
  if (created.length !== 1 || left.length > 0) {
    say(
      `Profil du navigateur de test : ${String(created.length)} créé, ${String(left.length)} laissé après fermeture (attendu : 1 créé, 0 laissé).`,
    );
    return 1;
  }
  say("Le navigateur de test supprime son profil à la fermeture.");
  return 0;
}

void main().then((code) => {
  process.exitCode = code;
});
