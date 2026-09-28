import { describe, expect, it } from "vitest";
import { auditActionLabel, auditActorLabel } from "./audit";

describe("audit journal wording", () => {
  it("names each action in plain French, and shows the code of a new one", () => {
    expect(auditActionLabel("sign-in")).toBe("Connexion");
    expect(auditActionLabel("notification.approved")).toBe("Notification validée");
    expect(auditActionLabel("something.new")).toBe("something.new");
    expect(auditActionLabel("toString")).toBe("toString");
  });

  it("says who acted, even for the system or a removed account", () => {
    expect(auditActorLabel("abc", "Awa")).toBe("Awa");
    expect(auditActorLabel("system", null)).toBe("Système");
    expect(auditActorLabel("abc", null)).toBe("Compte supprimé");
  });
});
