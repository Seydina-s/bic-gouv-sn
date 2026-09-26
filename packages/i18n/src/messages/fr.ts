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
    sourceAttribution: "Source\u00a0: {source}",
    machineTranslation: "Traduction automatique",
    listen: "Écouter",
    updatedJustNow: "Mis à jour à l'instant.",
    updatedMinutesAgo: "Mis à jour il y a {count} min.",
    updatedHoursAgo: {
      one: "Mis à jour il y a {count} heure.",
      other: "Mis à jour il y a {count} heures.",
    },
    updatedDaysAgo: {
      one: "Mis à jour il y a {count} jour.",
      other: "Mis à jour il y a {count} jours.",
    },
  },
  onboarding: {
    skip: "Passer",
    next: "Suivant",
    start: "Commencer",
    step: "Étape {current} sur {total}",
    languageTitle: "Choisissez votre langue",
    languageBody: "Vous pourrez la changer à tout moment dans les réglages.",
    newsTitle: "L'action du gouvernement, chaque jour",
    newsBody:
      "Conseil des ministres, communiqués, discours\u00a0: les publications officielles, dès leur mise en ligne.",
    sourceTitle: "La source, toujours",
    sourceBody: "Chaque article vient de presidence.sn et renvoie à sa page d'origine.",
    offlineTitle: "Gardez l'essentiel, même sans réseau",
    offlineBody: "Touchez le marque-page\u00a0: l'article reste lisible hors ligne.",
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
    offline: "Hors ligne\u00a0: voici les dernières actualités enregistrées.",
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
    noResult: "Aucun résultat pour «\u00a0{query}\u00a0».",
    offline: "La recherche a besoin d'une connexion. Réessayez quand vous êtes en ligne.",
  },
  procedures: {
    title: "Démarches",
    intro: "Les démarches administratives officielles, expliquées simplement.",
    count: {
      one: "{count} démarche",
      other: "{count} démarches",
    },
    searchLabel: "Rechercher une démarche",
    searchPlaceholder: "Un document, une démarche…",
    noResult: "Aucune démarche pour «\u00a0{query}\u00a0».",
    error: "Les démarches n'ont pas pu être chargées.",
    notFound: "Cette démarche n'est pas disponible.",
    cost: "Coût",
    delay: "Délai",
    delayDays: {
      one: "{count} jour",
      other: "{count} jours",
    },
    online: "En ligne",
    onlineYes: "Possible en ligne",
    eligibility: "Qui peut faire la démarche\u00a0?",
    documents: "Pièces à fournir",
    steps: "Ce qu'il faut savoir",
    offices: "Où s'adresser",
    faqs: "Questions fréquentes",
    legalTexts: "Textes officiels",
    usefulLinks: "Liens utiles",
    related: "Démarches liées",
    goOfficial: "Faire la démarche sur e-senegal.sn",
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
      "Aucun favori pour l'instant. Touchez le marque-page d'un article pour le garder\u00a0: il restera lisible hors ligne.",
  },
  comingSoon: {
    title: "Bientôt disponible",
    body: "Cette partie de l'application est en préparation.",
  },
} as const;

export type FrCatalog = typeof fr;
