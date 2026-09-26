import type { ProcedureDetail, ProcedureListResponse, ProcedureSummary } from "@bgs/shared-types";

// Test data with placeholder texts, not real administrative content.
const SUMMARY_A: ProcedureSummary = {
  id: "00000000-0000-5000-8000-0000000000a1",
  slug: "demarche-test-a",
  title: "Démarche de test A",
  summary: "Résumé de test A.",
  costFcfa: 20000,
  delayDays: 1,
  online: true,
};

export const PROCEDURE_LIST: ProcedureListResponse = {
  items: [
    SUMMARY_A,
    {
      id: "00000000-0000-5000-8000-0000000000a2",
      slug: "demarche-test-b",
      title: "Démarche de test B",
      summary: null,
      costFcfa: null,
      delayDays: null,
      online: false,
    },
  ],
  nextCursor: null,
  total: 2,
};

export const PROCEDURE_DETAIL: ProcedureDetail = {
  ...SUMMARY_A,
  translationStatus: "official",
  blocks: [{ type: "paragraph", inlines: [{ text: "Étape de test." }] }],
  eligibility: "Public de test.",
  documents: ["Pièce de test"],
  offices: [],
  faqs: [
    {
      question: "Question de test ?",
      blocks: [{ type: "paragraph", inlines: [{ text: "Réponse de test." }] }],
    },
  ],
  legalTexts: [],
  usefulLinks: [],
  related: [{ slug: "demarche-test-b", title: "Démarche de test B" }],
  sourceUrl: "https://e-senegal.sn/#/comprendre-ma-demarche/demarche/demarche-test-a",
  fetchedAt: "2026-09-25T10:00:00Z",
  version: 1,
};
