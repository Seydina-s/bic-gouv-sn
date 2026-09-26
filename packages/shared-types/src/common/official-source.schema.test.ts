import { describe, expect, it } from "vitest";
import {
  officialMediaUrl,
  officialSourceUrlSchema,
  youtubeVideoId,
} from "./official-source.schema";

describe("officialSourceUrlSchema", () => {
  it.each([
    "https://www.presidence.sn/fr/actualites",
    "https://presidence.sn/wo/",
    "https://e-senegal.sn/#/home/demarches",
  ])("accepts official source %s", (url) => {
    expect(officialSourceUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "https://example.com/article",
    "https://presidence.sn.evil.test/fr",
    "https://fakepresidence.sn/fr",
    "http://www.presidence.sn/fr",
    "not a url",
  ])("rejects non-official source %s", (url) => {
    expect(officialSourceUrlSchema.safeParse(url).success).toBe(false);
  });
});

describe("officialMediaUrl", () => {
  it("keeps official media and collapses the doubled slashes of the source", () => {
    expect(officialMediaUrl("https://bo-admin.presidence.sn//storage/image/a.jpg")).toBe(
      "https://bo-admin.presidence.sn/storage/image/a.jpg",
    );
  });

  it("moves the former media host (invalid certificate) to the current one", () => {
    expect(officialMediaUrl("https://bo.presidence.sn/uploads/images/x.png")).toBe(
      "https://bo-admin.presidence.sn/uploads/images/x.png",
    );
  });

  it.each([
    ["a social network image", "https://static.xx.fbcdn.net/images/emoji.png"],
    ["plain http", "http://bo-admin.presidence.sn/a.jpg"],
    ["a look-alike domain", "https://bo-admin.presidence.sn.example.com/a.jpg"],
    ["not a URL", "not a url"],
  ])("refuses %s", (_label, url) => {
    expect(officialMediaUrl(url)).toBeNull();
  });
});

describe("youtubeVideoId", () => {
  it("reads the id of an embedded video", () => {
    expect(youtubeVideoId("https://www.youtube.com/embed/UMZm4iPcFWE")).toBe("UMZm4iPcFWE");
    expect(youtubeVideoId("https://www.youtube-nocookie.com/embed/UMZm4iPcFWE?rel=0")).toBe(
      "UMZm4iPcFWE",
    );
  });

  it.each([
    "http://www.youtube.com/embed/UMZm4iPcFWE",
    "https://www.youtube.com/watch?v=UMZm4iPcFWE",
    "https://evil.example/embed/UMZm4iPcFWE",
    "https://www.youtube.com/embed/short",
    "not a url",
  ])("refuses %s", (url) => {
    expect(youtubeVideoId(url)).toBeNull();
  });
});
