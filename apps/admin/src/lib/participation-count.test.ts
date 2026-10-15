import { describe, expect, it } from "vitest";
import { unreadCount } from "./participation-count";

describe("unreadCount", () => {
  it("counts only what nobody has read yet", () => {
    const entry = (status: "new" | "handled") => ({ status }) as never;
    expect(unreadCount([entry("new"), entry("handled"), entry("new")])).toBe(2);
    expect(unreadCount([])).toBe(0);
  });
});
