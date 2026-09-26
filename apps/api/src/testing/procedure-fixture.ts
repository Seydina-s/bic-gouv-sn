import type { Procedure } from "@bgs/shared-types";

// Placeholder texts, not real content.
export function procedure(
  n: number,
  title: string,
  bodyHtml: string,
  overrides: Partial<Procedure> = {},
) {
  const sourceUrl = `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-${String(n)}`;
  const value: Procedure = {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "procedure",
    slug: `test-${String(n)}`,
    sourceUrl,
    sourcePublishedOn: null,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-26T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang: "fr",
    translations: [{ lang: "fr", status: "official", title, bodyHtml, sourceUrl }],
    audio: [],
    embedding: null,
    summary: null,
    costFcfa: null,
    delayDays: null,
    eligibility: null,
    documents: [],
    online: false,
    categories: [],
    offices: [],
    faqs: [],
    legalTexts: [],
    usefulLinks: [],
    related: [],
    ...overrides,
  };
  return value;
}
