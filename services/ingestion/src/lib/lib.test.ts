import { describe, expect, it, vi } from "vitest";
import { contentHash, stableUuid } from "./identity";
import { createRateLimiter } from "./rate-limiter";
import {
  damageIn,
  hasOfficialMedia,
  hasVideo,
  looksEnglish,
  plainLetters,
  sanitizeArticleHtml,
  textLength,
  unpublishable,
} from "./sanitize";

describe("sanitizeArticleHtml: embedded videos", () => {
  it("keeps an official YouTube embed, on the privacy-enhanced host, without extra attributes", () => {
    const html = sanitizeArticleHtml(
      '<p><iframe allowfullscreen="" frameborder="0" height="315" src="https://www.youtube.com/embed/UMZm4iPcFWE" width="100%" onload="x()"></iframe></p>',
    );
    expect(html).toBe(
      '<p><iframe src="https://www.youtube-nocookie.com/embed/UMZm4iPcFWE"></iframe></p>',
    );
    expect(hasVideo(html)).toBe(true);
  });

  it("completes a protocol-relative YouTube embed, as the source sometimes writes it", () => {
    expect(
      sanitizeArticleHtml('<p><iframe src="//www.youtube.com/embed/m6gWj4NjCp4"></iframe></p>'),
    ).toBe('<p><iframe src="https://www.youtube-nocookie.com/embed/m6gWj4NjCp4"></iframe></p>');
  });

  it("recognises official media in an article without text", () => {
    expect(hasOfficialMedia('<p><img src="https://bo-admin.presidence.sn/a.png" /></p>')).toBe(
      true,
    );
    expect(hasOfficialMedia('<p><img src="https://static.xx.fbcdn.net/e.png" /></p>')).toBe(false);
    expect(hasOfficialMedia("<p>Texte</p>")).toBe(false);
  });

  it.each([
    ["another host", '<iframe src="https://evil.example/embed/UMZm4iPcFWE"></iframe>'],
    ["a protocol-relative other host", '<iframe src="//evil.example/embed/UMZm4iPcFWE"></iframe>'],
    ["plain http", '<iframe src="http://www.youtube.com/embed/UMZm4iPcFWE"></iframe>'],
    ["a non-embed page", '<iframe src="https://www.youtube.com/watch?v=UMZm4iPcFWE"></iframe>'],
    ["a script URL", '<iframe src="javascript:alert(1)"></iframe>'],
  ])("drops a frame from %s", (_label, frame) => {
    const html = sanitizeArticleHtml(`<p>Texte</p>${frame}`);
    expect(html).toBe("<p>Texte</p>");
    expect(hasVideo(html)).toBe(false);
  });
});

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

describe("news text quality", () => {
  it("writes decorative letters and split accents as ordinary letters", () => {
    expect(plainLetters("𝐃𝐞́𝐥𝐞́𝐠𝐚𝐭𝐢𝐨𝐧")).toBe("Délégation");
    expect(plainLetters("été")).toBe("été");
  });

  it("sees a French text whose letters were replaced by question marks", () => {
    expect(damageIn("<p>Le Se?ne?gal a? 10 500 FCFA, de?cision</p>")).toBe(
      '3 letters replaced by "?"',
    );
  });

  it("sees a long French text that lost all its accents", () => {
    const lost = "Le Ministre a preside la reunion sur les activites conomiques. ".repeat(8);
    expect(damageIn(`<p>${lost}</p>`)).toBe(
      "French text without accents (characters lost at the source, or another language)",
    );
  });

  it("lets an ordinary French text through, and a question mark in a web address", () => {
    const ordinary = "Le Président de la République a présidé la réunion du Conseil. ".repeat(8);
    expect(damageIn(`<p>${ordinary} https://exemple.sn/page?id=1&a?b=c&d?e=f</p>`)).toBeNull();
  });

  it("checks the accents of French only, never Wolof", () => {
    const lost = "<p>" + "Le Ministre a preside la reunion. ".repeat(20) + "</p>";
    expect(unpublishable("Titre", lost, "wo")).toBeNull();
    expect(unpublishable("Titre", lost, "fr")).toMatch(/without accents/);
    expect(unpublishable("Titre", "<p></p>", "wo")).toBe("body is empty after sanitization");
  });
});

describe("text announced as French but written in English", () => {
  it("is set aside as English, not as damaged", () => {
    const english =
      "<p>" +
      "The Minister of Tourism chairs the meeting of the experts and the delegates in Dakar. ".repeat(
        6,
      ) +
      "</p>";
    expect(looksEnglish(english)).toBe(true);
    expect(unpublishable("Senegal shines", english, "fr")).toBe(
      "text in English (the app has no English edition yet)",
    );
  });

  it("never takes French for English", () => {
    const french =
      "<p>" +
      "Le Ministre de la Culture a présidé la réunion des experts et des délégués à Dakar. ".repeat(
        6,
      ) +
      "</p>";
    expect(looksEnglish(french)).toBe(false);
  });
});
