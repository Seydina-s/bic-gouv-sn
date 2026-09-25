/**
 * Reference French catalog. Every UI string lives here, never in components.
 * Short, direct, respectful (vouvoiement); strings are added screen by screen.
 */
export const fr = {
  app: {
    name: "Bic Gouv SN",
  },
  tabs: {
    navigation: "Navigation principale",
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
  /** Sections of presidence.sn, keyed by their slug. */
  categories: {
    "conseil-des-ministres": "Conseil des ministres",
    communiques: "Communiqués",
    international: "International",
    discours: "Discours",
    focus: "Focus",
    interviews: "Interviews & reportages",
    agenda: "Agenda",
    general: "Actualité",
  },
  feed: {
    latestCouncil: "Dernier Conseil des ministres",
    readCommunique: "Lire le communiqué",
    loadMore: "Chargement de la suite",
    lastOpened: "Dernière lecture",
    offline: "Hors ligne : voici les dernières actualités enregistrées.",
    empty: "Aucune actualité pour le moment.",
    error: "Les actualités n'ont pas pu être chargées.",
    retry: "Réessayer",
  },
  article: {
    back: "Retour",
    openSource: "Lire sur {source}",
    notFound: "Cet article n'est pas disponible.",
    image: "Photo de l'article",
  },
  comingSoon: {
    title: "Bientôt disponible",
    body: "Cette partie de l'application est en préparation.",
  },
} as const;

export type FrCatalog = typeof fr;
