import { describe, expect, it, vi } from "vitest";
import { contentHash, stableUuid } from "./identity";
import { createRateLimiter } from "./rate-limiter";
import { sanitizeArticleHtml, textLength } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("removes scripts, event handlers, styles and classes", () => {
    const dirty =
      '<div class="x1" style="color:red">Texte<script>alert(1)</script></div><img src="https://a.test/i.jpg" onerror="alert(2)">';
    const clean = sanitizeArticleHtml(dirty);
    expect(clean).toBe('<p>Texte</p><img src="https://a.test/i.jpg" />');
  });

  it("drops non-HTTPS and javascript links", () => {
    const clean = sanitizeArticleHtml(
      '<a href="javascript:alert(1)">x</a><a href="http://a.test">y</a><a href="https://a.test">z</a>',
    );
    expect(clean).toBe('<a>x</a><a>y</a><a href="https://a.test">z</a>');
  });

  it("turns source <div> blocks into paragraphs and removes empty ones", () => {
    expect(sanitizeArticleHtml("<div>Un</div><div><br></div><div>Deux<br></div>")).toBe(
      "<p>Un</p><p>Deux</p>",
    );
  });

  it("keeps structure: bold, lists, headings", () => {
    expect(sanitizeArticleHtml("<h1>T</h1><b>g</b><ul><li>a</li></ul>")).toBe(
      "<h2>T</h2><strong>g</strong><ul><li>a</li></ul>",
    );
  });

  it("measures visible text only", () => {
    expect(textLength("<p> Bonjour </p><img src='https://a.test/i.jpg' />")).toBe(7);
  });
});

describe("stableUuid", () => {
  it("matches the RFC 4122 / Python reference vector", () => {
    // uuid.uuid5(uuid.NAMESPACE_DNS, "python.org") in the Python documentation.
    expect(stableUuid("python.org", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
      "886313e1-3b8a-5372-9b90-0c9aee199e5d",
    );
  });

  it("is deterministic and distinct per source item", () => {
    const a = stableUuid("https://www.presidence.sn/article/1514");
    expect(stableUuid("https://www.presidence.sn/article/1514")).toBe(a);
    expect(stableUuid("https://www.presidence.sn/article/1513")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("contentHash", () => {
  it("changes when the content changes", () => {
    expect(contentHash({ title: "a" })).toMatch(/^[a-f0-9]{64}$/);
    expect(contentHash({ title: "a" })).toBe(contentHash({ title: "a" }));
    expect(contentHash({ title: "a" })).not.toBe(contentHash({ title: "b" }));
  });
});

describe("createRateLimiter", () => {
  it("starts calls one interval apart, in order, even when requested together", async () => {
    vi.useFakeTimers({ now: 0 });
    const schedule = createRateLimiter(1000);
    const starts: [number, number][] = [];
    const all = Promise.all(
      [1, 2, 3].map((n) => schedule(() => Promise.resolve(starts.push([n, Date.now()])))),
    );
    await vi.runAllTimersAsync();
    await all;
    expect(starts).toEqual([
      [1, 0],
      [2, 1000],
      [3, 2000],
    ]);
    vi.useRealTimers();
  });

  it("does not wait when the source was idle long enough", async () => {
    const schedule = createRateLimiter(1000);
    await expect(schedule(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
