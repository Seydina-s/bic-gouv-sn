import { describe, expect, it } from "vitest";
import { HASH, image } from "../testing/fixtures";
import { imageSchema, mediaKeySchema, pdfAttachmentSchema } from "./media.schema";

describe("imageSchema", () => {
  it("accepts an image with a JPEG fallback", () => {
    expect(imageSchema.safeParse(image()).success).toBe(true);
  });

  it("requires a JPEG fallback variant", () => {
    const variants = [{ format: "webp", width: 800, key: "images/test/800.webp", bytes: 1 }];
    expect(imageSchema.safeParse(image({ variants })).error?.issues[0]?.message).toMatch(/JPEG/);
  });

  it("rejects variants wider than the original", () => {
    const result = imageSchema.safeParse(image({ width: 400 }));
    expect(result.error?.issues[0]?.message).toMatch(/wider/);
  });
});

describe("mediaKeySchema", () => {
  it.each(["images/ab12/960.webp", "images/x/original.jpg"])("accepts %s", (key) => {
    expect(mediaKeySchema.safeParse(key).success).toBe(true);
  });

  it.each([
    "../etc/passwd",
    "/images/a.jpg",
    "images//a.jpg",
    "https://x.test/a.jpg",
    "Images/A.jpg",
  ])("rejects %s", (key) => {
    expect(mediaKeySchema.safeParse(key).success).toBe(false);
  });
});

describe("pdfAttachmentSchema", () => {
  const pdf = {
    sourceUrl: "https://www.presidence.sn/files/test.pdf",
    url: "https://cdn.example.test/files/test.pdf",
    title: null,
    mimeType: "application/pdf",
    bytes: 2048,
    contentHash: HASH,
  };

  it("accepts a PDF attachment", () => {
    expect(pdfAttachmentSchema.safeParse(pdf).success).toBe(true);
  });

  it("rejects other file types", () => {
    expect(pdfAttachmentSchema.safeParse({ ...pdf, mimeType: "text/html" }).success).toBe(false);
  });
});
