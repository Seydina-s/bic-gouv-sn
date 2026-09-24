/**
 * Reference French catalog. Every UI string lives here, never in components.
 * Only strings already set by CLAUDE.md or the reference mockup for now;
 * the rest is added screen by screen with UX writing review.
 */
export const fr = {
  tabs: {
    home: "Accueil",
    nearMe: "Près de moi",
    assistant: "Assistant IA",
    procedures: "Démarches",
    participate: "Participer",
  },
  content: {
    sourceAttribution: "Source : {source}",
    machineTranslation: "Traduction automatique",
    listen: "Écouter",
    updatedMinutesAgo: "Mis à jour il y a {count} min",
  },
  onboarding: {
    skip: "Passer",
  },
} as const;

export type FrCatalog = typeof fr;
