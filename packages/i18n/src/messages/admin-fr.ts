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
    circuits: {
      title: "Protection des sources",
      closed: "{name} : normale, les demandes passent.",
      open: "{name} : demandes suspendues depuis {time} après {failures} échecs de suite, pour ne pas surcharger le site ; reprise automatique après une courte pause.",
      halfOpen:
        "{name} : reprise en cours, une demande d'essai vérifie que le site répond de nouveau.",
    },
    nextAttempt:
      "La collecte ne s'arrête pas : nouvel essai automatique à {time}, puis toutes les 10 minutes au plus tant que le site ne répond pas ; tout ce qui aura été publié entre-temps sera rattrapé.",
  },
  duration: {
    lessThanAMinute: "moins d'une minute",
    minutes: "{minutes} min",
    hoursMinutes: "{hours} h {minutes} min",
    daysHours: "{days} j {hours} h",
  },
  nav: {
    label: "Sections de l'administration",
    groups: {
      follow: "Suivi",
      contents: "Contenus",
      settings: "Réglages",
    },
    status: "État du service",
    procedures: "Thèmes des démarches",
    services: "Services de l'État",
    errors: "Erreurs",
    withdrawn: "Articles masqués",
    searches: "Recherches sans résultat",
    remote: "Contrôle à distance",
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
  services: {
    title: "Services de l'État",
    intro:
      "Importés d'OpenStreetMap. Rien n'apparaît dans l'application avant d'être vérifié ici : ouvrez chaque service sur la carte, puis cochez ceux qui sont justes.",
    categories: "Catégories",
    category: {
      mairie: "Mairies",
      prefecture: "Gouvernances et préfectures",
      police: "Police",
      gendarmerie: "Gendarmerie",
      tribunal: "Tribunaux",
      ministere: "Ministères",
      administration: "Directions et agences",
    },
    zone: "Zone",
    zoneDakar: "Région de Dakar (zone pilote)",
    zoneAll: "Tout le Sénégal",
    toCheck: "{count} à vérifier",
    verified: {
      one: "{count} vérifié",
      other: "{count} vérifiés",
    },
    proposedTitle: "À vérifier : {category}",
    proposedIntro:
      "Cochez les services que vous avez vérifiés (nom et emplacement). Ceux qui ne sont pas des services de l'État, ou qui n'existent plus, s'écartent de la même façon.",
    openMap: "Voir sur la carte",
    verifyChecked: "Vérifier les services cochés",
    rejectChecked: "Écarter les services cochés",
    changedTitle: "Changés à la source depuis leur vérification",
    changedIntro:
      "OpenStreetMap indique un changement pour ces services ; l'application montre toujours la version vérifiée. Vérifiez-les de nouveau pour prendre le changement.",
    verifiedTitle: "Déjà vérifiés : {category}",
    verifiedOn: "vérifié le {date}",
    sourceNow: "Selon la source : {name}",
    nearTown: "près de {town}",
    correct: "Corriger",
    correctTitle: "Corriger un service",
    correctIntro:
      "Le nom, le type et l'emplacement corrigés ici l'emportent sur ceux d'OpenStreetMap, même après un nouvel import.",
    nameLabel: "Nom",
    categoryLabel: "Type de service",
    positionLabel: "Emplacement (latitude, longitude)",
    positionHelp:
      "Collez des coordonnées, ou le lien de l'emplacement exact copié depuis OpenStreetMap ou Google Maps.",
    positionInvalid: "Emplacement illisible : collez des coordonnées ou un lien de carte.",
    positionOutside:
      "Cet emplacement n'est pas au Sénégal. Vérifiez l'ordre : la latitude (entre 12 et 17) vient en premier.",
    openPosition: "Voir cet emplacement sur la carte",
    positionNotSaved:
      "Nom et type enregistrés, mais pas l'emplacement : le serveur doit d'abord être mis à jour. Réessayez ensuite.",
    sourcePosition: "Emplacement à la source : {position}",
    addService: "Ajouter un service absent de la liste",
    addTitle: "Ajouter un service de l'État",
    addIntro:
      "Pour un service qu'OpenStreetMap ne connaît pas. Il rejoint les services à vérifier : il n'apparaît dans l'application qu'une fois vérifié.",
    addressLabel: "Adresse (facultatif)",
    phoneLabel: "Téléphone (facultatif)",
    saveAdd: "Ajouter le service",
    added: "Service ajouté. Il attend maintenant sa vérification dans la liste « À vérifier ».",
    saveCorrection: "Enregistrer la correction",
    corrected: "Correction enregistrée.",
    correctedFrom: "Corrigé (à la source : {name}, {category})",
    back: "Retour aux services",
    hintNotState: "Nom d'entreprise ou d'organisme privé : probablement pas un service de l'État",
    hintVague: "Nom trop général : vérifiez l'emplacement sur la carte",
    unknown: "Ce service n'existe pas.",
    none: "Rien à vérifier ici.",
    doneVerified: {
      one: "{count} service vérifié : il apparaît dans l'application.",
      other: "{count} services vérifiés : ils apparaissent dans l'application.",
    },
    doneRejected: {
      one: "{count} service écarté.",
      other: "{count} services écartés.",
    },
    attribution: "Données © les contributeurs d'OpenStreetMap (licence ODbL).",
  },
  remote: {
    title: "Contrôle à distance",
    intro:
      "Couper une fonction qui pose problème dans toutes les applications installées, sans nouvelle version, ou exiger une mise à jour. Les téléphones appliquent le changement en une minute environ. Chaque changement est inscrit au journal d'audit.",
    features: "Fonctions de l'application",
    feature: {
      nearMe: "Près de moi (services de l'État)",
      map: "Carte de « Près de moi »",
      readAloud: "Écouter (lecture à voix haute)",
      procedures: "Démarches",
    },
    minVersion: "Version minimale de l'application",
    minVersionHelp:
      "Les versions plus anciennes demandent une mise à jour. Laissez vide pour n'en exiger aucune. Format : 1.2.0",
    minVersionInvalid:
      "Version illisible : écrivez trois nombres séparés par des points, par exemple 1.2.0.",
    save: "Enregistrer",
    saved: "Enregistré : les applications suivent dans la minute.",
    adminOnly: "Seul un compte administrateur peut modifier ces réglages.",
    failed: "Les réglages n'ont pas pu être chargés.",
  },
  searches: {
    title: "Recherches sans résultat",
    intro:
      "Ce que les gens cherchent dans l'app sans rien trouver : une piste pour voir ce qui manque. Seules les recherches faites au moins {minCount} fois apparaissent, et rien n'est gardé sur les personnes (ni adresse, ni appareil, ni heure) : uniquement le texte cherché et le jour.",
    none: "Aucune recherche sans résultat faite au moins {minCount} fois pour l'instant.",
    failed: "La liste n'a pas pu être chargée. Vérifiez l'état du service.",
    area: { news: "Actualités", procedures: "Démarches" },
    language: { fr: "Français", wo: "Wolof" },
    times: {
      one: "{count} fois",
      other: "{count} fois",
    },
    lastOn: "dernière fois le {day}",
    quoted: "«\u00a0{query}\u00a0»",
  },
  withdrawn: {
    title: "Articles masqués",
    intro:
      "Articles retirés du site de la Présidence : l'app ne les montre plus. Ils restent conservés ici, tels qu'ils étaient publiés, pour la traçabilité. Un retrait n'est retenu qu'après une seconde lecture de la page ; si la Présidence republie l'article, il réapparaît de lui-même.",
    none: "Aucun article masqué : tous les articles collectés sont encore publiés par la Présidence.",
    failed: "La liste n'a pas pu être chargée. Vérifiez l'état du service.",
    count: {
      one: "{count} version masquée",
      other: "{count} versions masquées",
    },
    withdrawnOn: "Retiré le {day} à {time}",
    language: { fr: "Français", wo: "Wolof" },
    source: "Ancienne page (lien d'origine)",
  },
  errors: {
    title: "Journal des erreurs",
    intro:
      "Chaque problème est expliqué simplement, avec ce qu'il faut faire. Les erreurs identiques sont regroupées ; les détails techniques sont repliés.",
    none: "Aucune erreur enregistrée : tout fonctionne normalement.",
    failed: "Le journal n'a pas pu être chargé. Vérifiez l'état du service.",
    severity: {
      critical: "Bloquant",
      warning: "À surveiller",
      info: "Pour information",
    },
    where: "Où",
    impact: "Impact",
    action: "Que faire",
    count: {
      one: "{count} fois",
      other: "{count} fois",
    },
    ongoing: "En cours",
    ended: "Terminé",
    since: "Depuis le {day} à {time}",
    last: "Dernière fois le {day} à {time}",
    uncatalogued:
      "Erreur non répertoriée : signalez ce code à l'équipe technique pour l'ajouter au catalogue.",
    technical: "Détails techniques",
    code: "Code",
    place: "Endroit",
    request: "Dernière requête",
  },
} as const;

export type AdminFrCatalog = typeof adminFr;
