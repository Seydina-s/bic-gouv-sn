import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SitesReview } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileDocument } from "./json-document";
import { readSitesReview, writeSitesReview } from "./sites-review-file";

const REVIEW: SitesReview = {
  checkedAt: "2026-10-12T03:00:00.000Z",
  sites: [
    {
      name: "Ministère fictif",
      url: "https://www.exemple.gouv.sn/",
      status: "frozen",
      newestDay: "2024-01-13",
    },
  ],
};

describe("sites review file", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-sites-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips, and reads a missing or damaged review as none", async () => {
    const path = join(dir, "sites-review.json");
    const document = fileDocument(path);
    expect(await readSitesReview(document)).toBeNull();
    await writeSitesReview(document, REVIEW);
    expect(await readSitesReview(document)).toEqual(REVIEW);
    await writeFile(path, "{broken");
    expect(await readSitesReview(document)).toBeNull();
    await writeFile(path, JSON.stringify({ ...REVIEW, sites: [{ status: "inconnu" }] }));
    expect(await readSitesReview(document)).toBeNull();
  });
});
