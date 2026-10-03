import { beforeEach, describe, expect, it, vi } from "vitest";

/** What the code under test asked of the connection pool, in order. */
const calls: string[] = [];
let failOn: string | null = null;
const poolEvents = new Map<string, (error: Error) => void>();

vi.mock("pg", () => {
  const run = (text: string) => {
    calls.push(text);
    if (text === failOn) {
      return Promise.reject(new Error(`failed: ${text}`));
    }
    return Promise.resolve({ rows: [{ text }] });
  };
  class Pool {
    readonly options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
    query = (text: string) => run(text);
    connect = () =>
      Promise.resolve({
        query: (text: string) => run(text),
        release: () => calls.push("release"),
      });
    on = (event: string, listener: (error: Error) => void) => {
      poolEvents.set(event, listener);
    };
    end = () => {
      calls.push("end");
      return Promise.resolve();
    };
  }
  return { default: { Pool } };
});

const { connectPostgres, openDatabase } = await import("./database");

beforeEach(() => {
  calls.length = 0;
  failOn = null;
  poolEvents.clear();
});

describe("connectPostgres", () => {
  it("runs a transaction's work between BEGIN and COMMIT, on one connection", async () => {
    const database = connectPostgres("postgres://localhost/test");
    const result = await database.transaction(async (tx) => {
      await tx.query("UPDATE things");
      return "done";
    });
    expect(result).toBe("done");
    expect(calls).toEqual(["BEGIN", "UPDATE things", "COMMIT", "release"]);
  });

  it("rolls everything back when the work fails, and gives the connection back", async () => {
    const database = connectPostgres("postgres://localhost/test");
    failOn = "UPDATE things";
    await expect(
      database.transaction(async (tx) => {
        await tx.query("UPDATE things");
      }),
    ).rejects.toThrow("failed: UPDATE things");
    expect(calls).toEqual(["BEGIN", "UPDATE things", "ROLLBACK", "release"]);
  });

  it("tells every listener about a lost idle connection", () => {
    const database = connectPostgres("postgres://localhost/test");
    const heard: string[] = [];
    database.onConnectionError((error) => heard.push(error.message));
    poolEvents.get("error")?.(new Error("connection lost"));
    expect(heard).toEqual(["connection lost"]);
  });

  it("runs plain queries on the pool and closes it", async () => {
    const database = connectPostgres("postgres://localhost/test");
    expect((await database.query("SELECT 1")).rows).toEqual([{ text: "SELECT 1" }]);
    await database.close();
    expect(calls).toEqual(["SELECT 1", "end"]);
  });
});

describe("openDatabase", () => {
  it("stays on files when no address is set", async () => {
    expect(await openDatabase(undefined)).toBeNull();
  });

  it("closes the pool when the schema cannot be brought up to date", async () => {
    failOn = "SELECT id FROM schema_migrations";
    await expect(openDatabase("postgres://localhost/test")).rejects.toThrow("failed");
    expect(calls).toContain("end");
  });
});
