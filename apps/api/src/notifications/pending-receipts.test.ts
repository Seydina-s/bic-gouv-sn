import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FilePendingReceiptStore, MemoryPendingReceiptStore } from "./pending-receipts";

const ticket = (n: number) => ({
  id: `ticket-${String(n)}`,
  token: `ExponentPushToken[test${String(n)}]`,
});

describe.each([
  ["on disk", () => new FilePendingReceiptStore(join(tmpdir(), "bgs-receipts", randomUUID()))],
  ["in memory", () => new MemoryPendingReceiptStore()],
])("the receipts still to read (%s)", (_name, create) => {
  it("gives the batches whose time has come, oldest first, until forgotten", async () => {
    const store = create();
    expect(await store.due(Date.now())).toEqual([]);
    await store.add(2_000, [ticket(2)]);
    await store.add(1_000, [ticket(1)]);
    await store.add(9_000, [ticket(9)]);
    const due = await store.due(5_000);
    expect(due.map(({ dueAt, issued }) => ({ dueAt, issued }))).toEqual([
      { dueAt: 1_000, issued: [ticket(1)] },
      { dueAt: 2_000, issued: [ticket(2)] },
    ]);
    await store.forget(due[0]?.key ?? "");
    expect((await store.due(5_000)).map(({ dueAt }) => dueAt)).toEqual([2_000]);
  });
});

describe("the receipts kept on disk", () => {
  it("are still there for the server started again, and other files are left alone", async () => {
    const folder = join(tmpdir(), "bgs-receipts", randomUUID());
    await new FilePendingReceiptStore(folder).add(1_000, [ticket(1)]);
    await writeFile(join(folder, "notes.txt"), "not a batch");
    const restarted = new FilePendingReceiptStore(folder);
    expect((await restarted.due(1_000)).map(({ issued }) => issued)).toEqual([[ticket(1)]]);
  });
});
