/**
 * Administration console strings (French only: the console is used by the BIC team).
 * Written for non-technical readers: what happened, then what to do.
 */
export const adminFr = {
  shell: {
    productName: "Bic Gouv SN",
    area: "Administration",
    skipToContent: "Aller au contenu",
  },
  status: {
    title: "État du service",
    checkedAt: "Vérifié à {time}",
    onlineSince: "En ligne depuis {duration}",
    recheck: "Vérifier à nouveau",
    whatToDo: "Que faire ?",
    errorCode: "Code : {code}",
    up: {
      verdict: "L'API fonctionne",
      detail: "Le serveur répond normalement.",
    },
    // Failure details and actions come from the shared error catalog (single source).
    down: { verdict: "L'API ne répond pas" },
    invalid: { verdict: "Réponse inattendue de l'API" },
    unconfigured: { verdict: "Adresse de l'API non configurée" },
  },
  ingestion: {
    title: "Collecte des actualités",
    ok: {
      verdict: "Les actualités se mettent à jour",
      detail: "Dernière vérification de presidence.sn à {time}.",
    },
    lastArticle: "Dernier nouvel article repéré à {time}, {delay} après sa mise en ligne.",
    unknown: {
      verdict: "État de la collecte inconnu",
      detail:
        "Aucun rapport de la collecte n'est disponible : elle n'a peut-être jamais été lancée, ou l'API ne répond pas.",
    },
    since: "Depuis {time}",
  },
  duration: {
    lessThanAMinute: "moins d'une minute",
    minutes: "{minutes} min",
    hoursMinutes: "{hours} h {minutes} min",
    daysHours: "{days} j {hours} h",
  },
} as const;

export type AdminFrCatalog = typeof adminFr;
