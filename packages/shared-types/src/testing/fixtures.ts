// Test-only builders. Texts are explicit placeholders, never real government content.

export const HASH = "a".repeat(64);
export const NOW = "2026-09-24T10:00:00Z";

export function frTranslation(overrides: Record<string, unknown> = {}) {
  return {
    lang: "fr",
    status: "official",
    title: "Titre de test",
    bodyHtml: "<p>Corps de test</p>",
    sourceUrl: "https://www.presidence.sn/fr/test-fixture",
    ...overrides,
  };
}

export function woTranslation(overrides: Record<string, unknown> = {}) {
  return frTranslation({
    lang: "wo",
    title: "Tiitar bu teste",
    sourceUrl: "https://www.presidence.sn/wo/test-fixture",
    ...overrides,
  });
}

export function audioTrack(overrides: Record<string, unknown> = {}) {
  return {
    lang: "fr",
    origin: "tts",
    url: "https://cdn.example.test/audio/test.opus",
    format: "opus",
    durationMs: 42_000,
    bytes: 120_000,
    createdAt: NOW,
    ...overrides,
  };
}

export function image(overrides: Record<string, unknown> = {}) {
  return {
    originalUrl: "https://www.presidence.sn/media/test.jpg",
    originalKey: "images/test/original.jpg",
    width: 1600,
    height: 900,
    alt: null,
    blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    variants: [
      { format: "avif", width: 800, key: "images/test/800.avif", bytes: 40_000 },
      { format: "jpeg", width: 800, key: "images/test/800.jpg", bytes: 90_000 },
    ],
    ...overrides,
  };
}

export function newsArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: "3f1c2b8e-4d5a-4f6b-9c7d-8e9f0a1b2c3d",
    kind: "news-article",
    category: "conseil-des-ministres",
    sourceUrl: "https://www.presidence.sn/fr/test-fixture",
    sourcePublishedOn: "2026-09-24",
    sourceUpdatedAt: "2026-09-24T09:00:00Z",
    fetchedAt: NOW,
    contentHash: HASH,
    version: 1,
    lang: "fr",
    translations: [frTranslation(), woTranslation()],
    audio: [],
    embedding: null,
    images: [image()],
    attachments: [],
    ...overrides,
  };
}
