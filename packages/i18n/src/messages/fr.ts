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
    allSections: "Tout",
    emptySection: "Aucune actualité dans cette rubrique pour le moment.",
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
    watchVideo: "Regarder la vidéo",
    videoHost: "Sur YouTube",
    share: "Partager",
  },
  search: {
    title: "Rechercher",
    placeholder: "Un mot, un lieu, une personne…",
    hint: "Tapez au moins 2 lettres pour chercher dans les actualités officielles.",
    noResult: "Aucun résultat pour « {query} ».",
    offline: "La recherche a besoin d'une connexion. Réessayez quand vous êtes en ligne.",
  },
  settings: {
    title: "Réglages",
    appearance: "Apparence",
    themeSystem: "Comme le téléphone",
    themeLight: "Clair",
    themeDark: "Sombre",
    language: "Langue",
    languageAuto: "Comme le téléphone",
    languageFr: "Français",
    languageWo: "Wolof",
    wolofNote:
      "Les actualités s'affichent dans leur version wolof officielle. Les textes de l'application seront traduits en wolof par des locuteurs natifs.",
    about: "À propos",
    aboutBody:
      "Bic Gouv SN relaie les informations officielles publiées sur presidence.sn. Chaque article renvoie à sa page d'origine.",
    version: "Version {version}",
  },
  favorites: {
    title: "Mes favoris",
    add: "Ajouter aux favoris",
    remove: "Retirer des favoris",
    empty:
      "Aucun favori pour l'instant. Touchez le marque-page d'un article pour le garder : il restera lisible hors ligne.",
  },
  comingSoon: {
    title: "Bientôt disponible",
    body: "Cette partie de l'application est en préparation.",
  },
} as const;

export type FrCatalog = typeof fr;
