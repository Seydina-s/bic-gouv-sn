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
    up: {
      verdict: "L'API fonctionne",
      detail: "Le serveur répond normalement.",
    },
    down: {
      verdict: "L'API ne répond pas",
      detail: "Les applications ne peuvent pas joindre le serveur en ce moment.",
      action:
        "Vérifiez que le serveur de l'API est démarré, puis vérifiez à nouveau. Si le problème continue, prévenez l'équipe technique.",
    },
    invalid: {
      verdict: "Réponse inattendue de l'API",
      detail: "Le serveur répond, mais pas dans le format attendu.",
      action: "Prévenez l'équipe technique : une mise à jour a peut-être été mal déployée.",
    },
    unconfigured: {
      verdict: "Adresse de l'API non configurée",
      detail: "L'administration ne sait pas où trouver le serveur.",
      action: "Renseignez la variable API_URL dans la configuration de l'administration.",
    },
  },
  duration: {
    lessThanAMinute: "moins d'une minute",
    minutes: "{minutes} min",
    hoursMinutes: "{hours} h {minutes} min",
    daysHours: "{days} j {hours} h",
  },
} as const;

export type AdminFrCatalog = typeof adminFr;
