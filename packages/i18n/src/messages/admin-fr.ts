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
  nav: {
    label: "Sections de l'administration",
    status: "État du service",
    procedures: "Thèmes des démarches",
    signOut: "Se déconnecter",
    signedInAs: "Connecté : {name}",
  },
  signIn: {
    title: "Connexion",
    intro: "Réservé à l'équipe d'administration de Bic Gouv SN.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    continue: "Continuer",
    codeTitle: "Code de vérification",
    codeIntro: "Ouvrez votre application d'authentification et saisissez le code à 6 chiffres.",
    code: "Code à 6 chiffres",
    confirm: "Se connecter",
    enrollTitle: "Activez votre second code",
    enrollIntro:
      "Première connexion : scannez ce QR code avec une application d'authentification (Google Authenticator, Microsoft Authenticator…), puis saisissez le code à 6 chiffres qu'elle affiche.",
    enrollManual: "Impossible de scanner ? Saisissez cette clé dans l'application :",
    restart: "Recommencer",
    failed: "Adresse, mot de passe ou code incorrect.",
    locked: "Trop de tentatives. Réessayez dans 15 minutes.",
    expired: "Cette étape a expiré. Recommencez la connexion.",
    unavailable: "La connexion est momentanément indisponible. Réessayez dans un instant.",
  },
  review: {
    title: "Thèmes des démarches",
    intro:
      "e-senegal.sn ne classe pas encore ses démarches. Un thème est proposé automatiquement pour chacune : vérifiez-le avant qu'il n'apparaisse dans l'application.",
    themes: "Thèmes",
    toCheck: "{count} à vérifier",
    validated: {
      one: "{count} validée",
      other: "{count} validées",
    },
    unclassified: "À classer",
    unclassifiedIntro: "Aucun thème n'a pu être proposé pour ces démarches : choisissez-en un.",
    proposedTitle: "Proposées pour « {theme} »",
    proposedIntro:
      "Décochez celles qui ne vont pas dans ce thème : elles resteront à vérifier. Pour en déplacer une, ouvrez « Mettre une de ces démarches dans un autre thème », plus bas.",
    validateChecked: "Valider les démarches cochées",
    validatedTitle: "Déjà validées dans « {theme} »",
    moveTo: "Thème pour « {procedure} »",
    fileHere: "Classer ici",
    byClaude: "classée par Claude (délégation)",
    addedTheme: "thème ajouté",
    moveSummary: "Mettre une de ces démarches dans un autre thème",
    none: "Rien à vérifier dans ce thème.",
    done: {
      one: "{count} démarche validée dans « {theme} ».",
      other: "{count} démarches validées dans « {theme} ».",
    },
    failed: "L'enregistrement a échoué. Réessayez ; si cela persiste, vérifiez l'état du service.",
    forbidden: "Votre rôle ne permet pas cette action.",
  },
} as const;

export type AdminFrCatalog = typeof adminFr;
