import { createProceduresClient } from "../../api/procedures-client";
import { PROCEDURE_DETAIL, PROCEDURE_LIST } from "../../testing/procedure-fixtures";
import { formatFcfa } from "./format";

function clientAnswering(body: unknown) {
  const fetchImpl = jest.fn<Promise<Response>, [string]>(() =>
    Promise.resolve(new Response(JSON.stringify(body))),
  );
  const client = createProceduresClient({
    baseUrl: "https://api.test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

describe("procedures client", () => {
  it("asks for the alphabetical list without a query", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_LIST);
    await expect(client.listProcedures("", null)).resolves.toEqual(PROCEDURE_LIST);
    expect(fetchImpl).toHaveBeenCalledWith("https://api.test/v1/procedures?limit=30", {
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it("sends the query and the cursor of the next page", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_LIST);
    await client.listProcedures("carte d'identité", "abc");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.test/v1/procedures?limit=30&q=carte+d%27identit%C3%A9&cursor=abc",
    );
  });

  it("reads one procedure by its slug", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_DETAIL);
    await expect(client.getProcedure("demarche-test-a")).resolves.toEqual(PROCEDURE_DETAIL);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.test/v1/procedures/demarche-test-a");
  });

  it("refuses an answer of the wrong shape", async () => {
    const { client } = clientAnswering({ nope: true });
    await expect(client.getProcedure("x")).rejects.toThrow("unexpected shape");
  });
});

describe("formatFcfa", () => {
  it("groups thousands the French way and keeps the unit on the same line", () => {
    const text = formatFcfa(20000);
    expect(text).toMatch(/^20\s000\sF\sCFA$/u);
    expect(text).not.toContain(" F");
  });
});
