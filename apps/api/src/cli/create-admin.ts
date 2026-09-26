// Creates an admin console account from the command line (the first administrator
// cannot be created from the console itself). The password is typed twice, hidden.
// Messages are in French: this command is run by the administration team.
//   pnpm --filter @bgs/api admin:create -- --email prenom.nom@bic.sn --name "Prénom Nom" --role admin
// The second factor is set up at the first sign-in (QR code in the console).
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword, isRole, passwordProblem, PASSWORD_MIN_LENGTH } from "@bgs/admin-auth";
import { z } from "zod";
import { loadConfig } from "../config";
import { FileAdminAccountStore } from "../admin/account-store";
import { FileAuditJournal } from "../admin/audit-journal";

/** Reads one line without echoing it (the terminal shows nothing while typing). */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY) {
      reject(
        new Error(
          "Lancez cette commande dans un terminal : le mot de passe se tape, il ne se transmet jamais.",
        ),
      );
      return;
    }
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    let typed = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          input.setRawMode(false);
          input.pause();
          input.off("data", onData);
          process.stdout.write("\n");
          resolve(typed);
          return;
        }
        if (char === "\u0003") {
          process.exit(130);
        }
        typed = char === "\u007f" || char === "\b" ? typed.slice(0, -1) : typed + char;
      }
    };
    input.on("data", onData);
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string" } },
  });
  const email = z.email().safeParse(values.email?.trim().toLowerCase());
  if (!email.success || values.name === undefined || !isRole(values.role)) {
    throw new Error(
      'Utilisation : admin:create -- --email <e-mail> --name "<nom>" --role reviewer|editor|admin',
    );
  }
  const config = loadConfig(process.env);
  const accounts = new FileAdminAccountStore(config.ADMIN_ACCOUNTS_PATH);
  if ((await accounts.findByEmail(email.data)) !== null) {
    throw new Error(`Un compte existe déjà pour ${email.data}.`);
  }
  const password = await readHidden(
    `Mot de passe (${String(PASSWORD_MIN_LENGTH)} caractères ou plus) : `,
  );
  const problem = passwordProblem(password);
  if (problem !== null) {
    throw new Error(
      `Mot de passe refusé : ${problem === "too-short" ? "trop court" : "trop long"}.`,
    );
  }
  if ((await readHidden("Le même mot de passe, une seconde fois : ")) !== password) {
    throw new Error("Les deux mots de passe sont différents.");
  }
  const id = randomUUID();
  await accounts.save({
    id,
    email: email.data,
    name: values.name,
    role: values.role,
    passwordHash: await hashPassword(password),
    totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
    attempts: { failures: [], lockedUntil: null },
    disabled: false,
    createdAt: new Date().toISOString(),
  });
  await new FileAuditJournal(config.ADMIN_AUDIT_PATH).append({
    at: new Date().toISOString(),
    actor: "system:command-line",
    action: "account.created",
    target: id,
    details: { role: values.role },
  });
  process.stdout.write(
    `Compte créé pour ${email.data} (${values.role}). Le second code s'active à la première connexion.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
