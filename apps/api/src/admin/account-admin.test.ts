import { describe, expect, it } from "vitest";
import { adminForTests } from "../testing/admin-session";
import { ACTIVATION_MS, AccountAdmin } from "./account-admin";

// Placeholder person, not a real team member.
const PERSON = { name: "Personne de test", email: "personne@bic.test", role: "reviewer" } as const;
const PASSWORD = "une phrase de passe choisie";

async function setUp() {
  const services = await adminForTests();
  let now = Date.parse("2026-09-29T08:00:00Z");
  const accountAdmin = new AccountAdmin({ ...services.admin, now: () => now });
  const { id: actorId } = await services.signedIn("admin");
  return {
    ...services,
    accountAdmin,
    actorId,
    later: (ms: number) => {
      now += ms;
    },
  };
}

describe("activation links", () => {
  it("stop working after 72 hours", async () => {
    const { accountAdmin, actorId, later } = await setUp();
    const { code, expiresAt } = await accountAdmin.create(actorId, PERSON);
    expect(expiresAt).toBe("2026-10-02T08:00:00.000Z");
    later(ACTIVATION_MS);
    await expect(accountAdmin.activate(code, PASSWORD)).rejects.toMatchObject({
      code: "ACCOUNT_ACTIVATION_INVALID",
    });
  });

  it("do nothing for a disabled account", async () => {
    const { accountAdmin, actorId } = await setUp();
    const { code, account } = await accountAdmin.create(actorId, PERSON);
    await accountAdmin.setDisabled(actorId, account.id, true);
    await expect(accountAdmin.activate(code, PASSWORD)).rejects.toMatchObject({
      code: "ACCOUNT_ACTIVATION_INVALID",
    });
  });

  it("are kept as a fingerprint only", async () => {
    const { accountAdmin, accounts, actorId } = await setUp();
    const { code, account } = await accountAdmin.create(actorId, PERSON);
    const stored = await accounts.get(account.id);
    expect(stored?.activation?.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(code);
  });

  it("show when they expire only while the account waits for its password", async () => {
    const { accountAdmin, actorId } = await setUp();
    const { code, account } = await accountAdmin.create(actorId, PERSON);
    expect(account.activationExpiresAt).not.toBeNull();
    await accountAdmin.activate(code, PASSWORD);
    const [, activated] = await accountAdmin.list();
    expect(activated).toMatchObject({ state: "no-second-factor", activationExpiresAt: null });
  });
});

describe("role changes", () => {
  it("journal nothing when the role stays the same", async () => {
    const { accountAdmin, actorId, journal, signedIn } = await setUp();
    const other = await signedIn("editor");
    await accountAdmin.changeRole(actorId, other.id, "editor");
    const actions = (await journal.entries()).map((entry) => entry.action);
    expect(actions).not.toContain("account.role-changed");
  });
});
