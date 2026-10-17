import { createProceduresClient } from "../../api/procedures-client";
import { PROCEDURE_DETAIL, PROCEDURE_LIST } from "../../testing/procedure-fixtures";
import { formatFcfa } from "./format";
import { themeTitle } from "./theme-title";

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
    await expect(client.listProcedures("fr", "", null)).resolves.toEqual(PROCEDURE_LIST);
    expect(fetchImpl).toHaveBeenCalledWith("https://api.test/v1/procedures?lang=fr&limit=30", {
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it("sends the query and the cursor of the next page", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_LIST);
    await client.listProcedures("fr", "carte d'identité", "abc");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.test/v1/procedures?lang=fr&limit=30&q=carte+d%27identit%C3%A9&cursor=abc",
    );
  });

  it("asks for the sheets in the reader's language, French when not translated (ML-14)", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_LIST);
    await client.listProcedures("en", "", null);
    await client.themePage("wo", "etatcivil", 2);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/v1/procedures?lang=en&fallback=fr&limit=30",
      "https://api.test/v1/procedures?lang=wo&fallback=fr&limit=20&theme=etatcivil&page=2",
    ]);
  });

  it("reads one procedure by its slug", async () => {
    const { client, fetchImpl } = clientAnswering(PROCEDURE_DETAIL);
    await expect(client.getProcedure("en", "demarche-test-a")).resolves.toEqual(PROCEDURE_DETAIL);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.test/v1/procedures/demarche-test-a?lang=en&fallback=fr",
    );
  });

  it("refuses an answer of the wrong shape", async () => {
    const { client } = clientAnswering({ nope: true });
    await expect(client.getProcedure("fr", "x")).rejects.toThrow("unexpected shape");
  });
});

describe("formatFcfa", () => {
  it("groups thousands the French way and keeps the unit on the same line", () => {
    const text = formatFcfa(20000);
    expect(text).toMatch(/^20\s000\sF\sCFA$/u);
    expect(text).not.toContain(" F");
  });
});

describe("themeTitle (ML-14)", () => {
  const transports = { id: "688d064649b595b42707a1f8", title: "Transports" };

  it("gives an official theme's title in the reader's language", () => {
    expect(themeTitle(transports, "en")).toBe("Transportation");
    expect(themeTitle(transports, "wo")).toBe("Dem-dikk");
    expect(themeTitle(transports, "fr")).toBe("Transports");
  });

  it("keeps the source's title for a theme renamed or unknown", () => {
    expect(themeTitle({ ...transports, title: "Transports et mobilité" }, "en")).toBe(
      "Transports et mobilité",
    );
    expect(themeTitle({ id: "nouveau", title: "Nouveau thème" }, "en")).toBe("Nouveau thème");
  });
});
