import { describe, expect, it } from "vitest";
import { frTranslation, NOW } from "../testing/fixtures";
import { translationSchema } from "./translation.schema";

const review = { reviewerId: "reviewer-1", reviewedAt: NOW };

describe("translationSchema", () => {
  it("accepts an official translation linked to its source", () => {
    expect(translationSchema.safeParse(frTranslation()).success).toBe(true);
  });

  it("rejects an official translation without source link", () => {
    const result = translationSchema.safeParse(frTranslation({ sourceUrl: undefined }));
    expect(result.error?.issues[0]?.path).toEqual(["sourceUrl"]);
  });

  it("accepts a machine translation without review", () => {
    const machine = frTranslation({ status: "machine", sourceUrl: undefined });
    expect(translationSchema.safeParse(machine).success).toBe(true);
  });

  it("rejects a machine translation carrying a review", () => {
    const machine = frTranslation({ status: "machine", review });
    expect(translationSchema.safeParse(machine).error?.issues[0]?.path).toEqual(["review"]);
  });

  it("requires a review for reviewed translations", () => {
    expect(translationSchema.safeParse(frTranslation({ status: "reviewed" })).success).toBe(false);
    expect(translationSchema.safeParse(frTranslation({ status: "reviewed", review })).success).toBe(
      true,
    );
  });

  it("rejects blank titles and unknown fields", () => {
    expect(translationSchema.safeParse(frTranslation({ title: "   " })).success).toBe(false);
    expect(translationSchema.safeParse(frTranslation({ opinion: "x" })).success).toBe(false);
  });
});
