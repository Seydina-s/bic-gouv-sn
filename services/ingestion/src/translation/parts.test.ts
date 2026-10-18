import { describe, expect, it } from "vitest";
import type { BatchResult } from "./claude-batches";
import { joinParts, partId } from "./parts";

const ok = (customId: string, text: string, truncated = false): BatchResult => ({
  customId,
  ok: true,
  text,
  inputTokens: 100,
  outputTokens: 10,
  truncated,
});
const join = (texts: readonly string[]) => texts.join("+");

describe("an item sent in parts", () => {
  it("keeps its own id in one piece, and numbers its parts otherwise", () => {
    expect(partId("a1", 0, 1)).toBe("a1");
    expect(partId("a1", 1, 3)).toBe("a1_part1");
    // Letters, digits, "-" and "_" only: what the provider accepts.
    expect(partId("00000000-0000-5000-8000-000000000001", 2, 3)).toMatch(/^[\w-]{1,64}$/);
  });

  it("gets its parts joined back in order, tokens summed, beside whole items", () => {
    const joined = joinParts(
      [ok("b_part1", "deux"), ok("whole", "seul"), ok("b_part0", "un")],
      join,
    );
    expect(joined).toEqual([
      ok("whole", "seul"),
      {
        customId: "b",
        ok: true,
        text: "un+deux",
        inputTokens: 200,
        outputTokens: 20,
        truncated: false,
      },
    ]);
  });

  it("is failed or cut short as a whole when one part is", () => {
    const failed = joinParts(
      [ok("c_part0", "un"), { customId: "c_part1", ok: false, reason: "expired" }],
      join,
    );
    expect(failed).toEqual([{ customId: "c", ok: false, reason: "expired" }]);
    const cut = joinParts([ok("d_part0", "un"), ok("d_part1", "de", true)], join);
    expect(cut[0]).toMatchObject({ customId: "d", ok: true, truncated: true });
    // Parts that cannot be joined give an empty text: refused as unreadable later.
    expect(joinParts([ok("e_part0", "un"), ok("e_part1", "deux")], () => null)[0]).toMatchObject({
      text: "",
    });
  });
});
