// Replaces the key sealing the second-factor secrets (SEC-05), never showing any
// key: only short fingerprints. Stop the API first; restart it afterwards.
// Messages are in French: this command is run by the administration team.
//   Development (the key lives in .env.local): pnpm --filter @bgs/api admin:rotate-key
//   Production (the secret manager holds the keys): put the new key in
//   ADMIN_SECRET_KEY and the old one in ADMIN_SECRET_KEYS_PREVIOUS, then
//   pnpm --filter @bgs/api admin:reseal, then remove the old key from the manager.
import { chmod, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { writeFileDurably } from "@bgs/content-store";
import { loadConfig } from "../config";
import { FileAdminAccountStore } from "../admin/account-store";
import { FileAuditJournal } from "../admin/audit-journal";
import { newSecretKey, resealAll, withEnvValue, type ResealReport } from "../admin/key-rotation";
import { SecretBox } from "../admin/secret-box";

const ENV_FILE = resolve(".env.local");
const say = (line: string) => process.stdout.write(`${line}\n`);

/** Writes the env file readable by its owner only (where the system allows it). */
async function writeEnv(text: string): Promise<void> {
  await writeFileDurably(ENV_FILE, text);
  await chmod(ENV_FILE, 0o600).catch(() => undefined);
}

async function journal(path: string, action: string, box: SecretBox, report: ResealReport) {
  await new FileAuditJournal(path).append({
    at: new Date().toISOString(),
    actor: "system:command-line",
    action,
    target: null,
    details: { keyFingerprint: box.fingerprint, ...report },
  });
}

function explain(box: SecretBox, report: ResealReport): void {
  say(`Clé en service : empreinte ${box.fingerprint} (la clé elle-même n'est jamais affichée).`);
  say(`${String(report.resealed)} secret(s) de second code rechiffré(s).`);
  if (report.unreadable > 0) {
    say(
      `${String(report.unreadable)} secret(s) illisible(s) : gardez l'ancienne clé et prévenez l'équipe technique.`,
    );
  }
}

/** The env file's text, or nothing yet on a new machine. */
async function readEnv(): Promise<string> {
  try {
    return await readFile(ENV_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function rotateLocal(): Promise<void> {
  const config = loadConfig(process.env);
  const oldKey = config.ADMIN_SECRET_KEY;
  const key = newSecretKey();
  if (oldKey === undefined) {
    // A new machine: the first key, created without ever being shown.
    await writeEnv(withEnvValue(await readEnv(), "ADMIN_SECRET_KEY", key));
    say(`Clé créée : empreinte ${new SecretBox(key).fingerprint}. Démarrez l'API.`);
    return;
  }
  const previous = [oldKey, ...config.ADMIN_SECRET_KEYS_PREVIOUS];
  // New key first, old ones kept: a stop at any point never locks anyone out.
  let text = await readEnv();
  text = withEnvValue(text, "ADMIN_SECRET_KEY", key);
  text = withEnvValue(text, "ADMIN_SECRET_KEYS_PREVIOUS", previous.join(","));
  await writeEnv(text);
  const box = new SecretBox(key, previous);
  const report = await resealAll(new FileAdminAccountStore(config.ADMIN_ACCOUNTS_PATH), box);
  if (report.unreadable === 0) {
    await writeEnv(withEnvValue(text, "ADMIN_SECRET_KEYS_PREVIOUS", null));
    say("Ancienne clé retirée : elle ne sert plus à rien.");
  }
  await journal(config.ADMIN_AUDIT_PATH, "secret-key.rotated", box, report);
  explain(box, report);
  say("Redémarrez l'API pour qu'elle utilise la nouvelle clé.");
}

async function resealWithGivenKeys(): Promise<void> {
  const config = loadConfig(process.env);
  if (config.ADMIN_SECRET_KEY === undefined) {
    throw new Error("Aucune clé ADMIN_SECRET_KEY : rien à rechiffrer.");
  }
  const box = new SecretBox(config.ADMIN_SECRET_KEY, config.ADMIN_SECRET_KEYS_PREVIOUS);
  const report = await resealAll(new FileAdminAccountStore(config.ADMIN_ACCOUNTS_PATH), box);
  await journal(config.ADMIN_AUDIT_PATH, "secrets.resealed", box, report);
  explain(box, report);
  if (report.unreadable === 0) {
    say("Vous pouvez retirer l'ancienne clé (ADMIN_SECRET_KEYS_PREVIOUS) du coffre de secrets.");
  }
}

const run = process.argv.includes("--reseal") ? resealWithGivenKeys : rotateLocal;
run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
