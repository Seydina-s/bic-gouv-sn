import { describe, expect, it } from "vitest";
import { diskSpace } from "./disk-space";

describe("diskSpace", () => {
  it("measures the disk holding a folder, and gives nothing for a missing one", async () => {
    const disk = await diskSpace(process.cwd());
    expect(disk?.totalBytes).toBeGreaterThan(0);
    expect(disk?.freeBytes).toBeLessThanOrEqual(disk?.totalBytes ?? 0);
    await expect(diskSpace("/no/such/folder/anywhere")).resolves.toBeUndefined();
  });
});
