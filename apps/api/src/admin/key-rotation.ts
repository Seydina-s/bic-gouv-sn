import { randomBytes } from "node:crypto";
import type { AdminAccountStore } from "./account-store";
import type { SecretBox } from "./secret-box";

export interface ResealReport {
  /** Secrets now sealed with the current key. */
  resealed: number;
  /** Secrets no key of the box could open: the previous key must be kept. */
  unreadable: number;
}

/** A new key: 32 random bytes, base64 (never written anywhere but its store). */
export function newSecretKey(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Seals every second-factor secret again with the box's current key, from the
 * latest saved state of each account. Afterwards, when nothing is unreadable, the
 * previous keys can be dropped.
 */
export async function resealAll(
  accounts: AdminAccountStore,
  box: SecretBox,
): Promise<ResealReport> {
  const report: ResealReport = { resealed: 0, unreadable: 0 };
  for (const { id } of await accounts.list()) {
    await accounts.update(id, (account) => {
      const sealed = account.totp.sealedSecret;
      if (sealed === null || box.isCurrent(sealed)) {
        return account;
      }
      const secret = box.open(sealed);
      if (secret === null) {
        report.unreadable += 1;
        return account;
      }
      report.resealed += 1;
      return { ...account, totp: { ...account.totp, sealedSecret: box.seal(secret) } };
    });
  }
  return report;
}

/** An env file with one variable set (value) or removed (null), other lines kept. */
export function withEnvValue(text: string, name: string, value: string | null): string {
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => !line.startsWith(`${name}=`));
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  if (value === null) {
    return kept.join("\n");
  }
  const line = `${name}=${value}`;
  if (index === -1) {
    const end = kept.at(-1) === "" ? kept.length - 1 : kept.length;
    kept.splice(end, 0, line);
    return kept.join("\n");
  }
  kept.splice(index, 0, line);
  return kept.join("\n");
}
