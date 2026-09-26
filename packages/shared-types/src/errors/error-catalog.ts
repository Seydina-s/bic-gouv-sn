/**
 * Plain-language error catalog (CLAUDE.md §4.5). Every technical error code used in
 * the platform is declared here, with what a non-technical admin needs to read in a
 * few seconds. Runtime facts (users affected, since when) come from monitoring.
 */

/** Red: users are blocked · Yellow: degraded or needs attention · Green: informational. */
export type ErrorSeverity = "critical" | "warning" | "info";

export interface ErrorExplanation {
  /** What happened, in one simple sentence. */
  what: string;
  /** Screen or service concerned. */
  where: string;
  /** Who or what is affected. */
  impact: string;
  severity: ErrorSeverity;
  /** Suggested action, one line. */
  action: string;
}

export const ERROR_CATALOG = {
  RESILIENCE_TIMEOUT: {
    what: "Un service extérieur a mis trop de temps à répondre.",
    where: "Appel à un service extérieur (source officielle, voix, IA, notifications…)",
    impact: "L'opération concernée n'a pas abouti ; l'app affiche la dernière version connue.",
    severity: "warning",
    action: "Si cela se répète, vérifiez l'état du service concerné dans la supervision.",
  },
  RESILIENCE_CIRCUIT_OPEN: {
    what: "Un service extérieur est mis en pause après plusieurs échecs de suite.",
    where: "Supervision des dépendances",
    impact: "La fonction qui en dépend passe en mode dégradé jusqu'au prochain essai automatique.",
    severity: "critical",
    action: "Vérifiez que le service concerné fonctionne ; la reprise est automatique.",
  },
  RESILIENCE_ABORTED: {
    what: "Une opération a été annulée avant la fin, par exemple parce que l'écran a été fermé.",
    where: "App ou serveur",
    impact: "Aucun : c'est un comportement normal.",
    severity: "info",
    action: "Rien à faire.",
  },
  API_CONFIG_INVALID: {
    what: "Le serveur de l'API ne peut pas démarrer : sa configuration est incorrecte.",
    where: "Serveur de l'API (démarrage)",
    impact: "Toutes les applications sont privées de nouvelles données.",
    severity: "critical",
    action: "Corrigez la variable de configuration indiquée dans le message, puis redémarrez.",
  },
  ROUTE_NOT_FOUND: {
    what: "Une adresse inexistante de l'API a été demandée.",
    where: "API publique",
    impact: "En général aucun ; en grand nombre, peut signaler une app trop ancienne ou un abus.",
    severity: "info",
    action: "Rien à faire, sauf si le nombre augmente brutalement.",
  },
  REQUEST_INVALID: {
    what: "L'API a reçu une demande mal formée.",
    where: "API publique",
    impact: "La demande concernée est refusée.",
    severity: "info",
    action: "Si cela vient de l'app officielle, prévenez l'équipe technique.",
  },
  NEWS_NOT_FOUND: {
    what: "Un article demandé n'existe pas ou n'est pas disponible dans cette langue.",
    where: "API publique, actualités",
    impact: "L'utilisateur voit un message « article introuvable ».",
    severity: "info",
    action: "Rien à faire, sauf si le nombre augmente (lien cassé dans une notification ?).",
  },
  RATE_LIMITED: {
    what: "Trop de demandes sont arrivées depuis la même adresse réseau.",
    where: "API publique (protection contre les abus)",
    impact:
      "Les demandes en excès sont refusées une minute ; en cas de hausse soudaine, possible abus ou robot.",
    severity: "warning",
    action:
      "Si cela touche beaucoup d'utilisateurs d'un opérateur, prévenez l'équipe technique (seuil à relever).",
  },
  SERVICE_NOT_READY: {
    what: "Le serveur de l'API tourne mais ne peut pas encore lire les articles.",
    where: "API publique (sonde de disponibilité)",
    impact:
      "Le répartiteur de charge n'envoie pas de citoyens vers ce serveur tant qu'il n'est pas prêt.",
    severity: "critical",
    action:
      "Vérifiez l'accès au stockage des articles ; si cela dure, prévenez l'équipe technique.",
  },
  INTERNAL_ERROR: {
    what: "Une erreur inattendue s'est produite dans l'API.",
    where: "API publique",
    impact: "La demande concernée a échoué pour l'utilisateur.",
    severity: "critical",
    action: "Transmettez l'identifiant de la requête à l'équipe technique.",
  },
  INGESTION_SOURCE_UNREACHABLE: {
    what: "Le site de la Présidence ne répond pas à la collecte des articles.",
    where: "Collecte automatique (presidence.sn)",
    impact:
      "Les nouveaux articles n'arrivent plus dans l'app ; les articles déjà collectés restent visibles.",
    severity: "critical",
    action: "Vérifiez que presidence.sn est accessible ; la collecte reprend seule dès son retour.",
  },
  PROCEDURE_NOT_FOUND: {
    what: "Une démarche demandée n'existe pas (ou plus).",
    where: "API publique (/v1/procedures)",
    impact:
      "La personne voit un message « démarche introuvable » ; les autres démarches s'affichent.",
    severity: "info",
    action:
      "Rien à faire si c'est ponctuel ; si cela se répète, vérifiez la collecte des démarches.",
  },
  ADMIN_SIGN_IN_FAILED: {
    what: "Une tentative de connexion au centre d'administration a échoué (mauvais e-mail, mot de passe ou code).",
    where: "Centre d'administration (connexion)",
    impact: "La personne n'entre pas ; aucun accès n'a été donné.",
    severity: "info",
    action:
      "Rien à faire si c'est ponctuel ; de nombreux échecs sur un même compte peuvent signaler une tentative d'intrusion.",
  },
  ADMIN_TOO_MANY_ATTEMPTS: {
    what: "Un compte d'administration est bloqué 15 minutes après 5 tentatives de connexion ratées.",
    where: "Centre d'administration (connexion)",
    impact: "La personne concernée doit attendre 15 minutes avant de réessayer.",
    severity: "warning",
    action:
      "Vérifiez avec la personne que c'était bien elle ; sinon, changez son mot de passe et consultez le journal d'audit.",
  },
  ADMIN_SESSION_EXPIRED: {
    what: "Une session du centre d'administration a expiré (30 minutes sans activité ou 8 heures au total).",
    where: "Centre d'administration",
    impact: "La personne doit se reconnecter ; rien n'est perdu.",
    severity: "info",
    action: "Rien à faire : c'est une protection normale.",
  },
  ADMIN_FORBIDDEN: {
    what: "Un compte a tenté une action que son rôle ne permet pas.",
    where: "Centre d'administration",
    impact: "L'action a été refusée ; rien n'a été modifié.",
    severity: "warning",
    action:
      "Si la personne a besoin de ce droit, un administrateur change son rôle ; sinon, consultez le journal d'audit.",
  },
  INGESTION_STOPPED: {
    what: "La surveillance des nouvelles publications de la Présidence est arrêtée.",
    where: "Collecte automatique (presidence.sn)",
    impact:
      "Les nouveaux articles n'arrivent plus dans l'app ; les articles déjà collectés restent visibles.",
    severity: "critical",
    action: "Relancez le service de collecte, ou prévenez l'équipe technique.",
  },
  INGESTION_QUARANTINED: {
    what: "Un article collecté est incomplet ou mal formé : il n'a pas été publié.",
    where: "Collecte automatique (presidence.sn)",
    impact: "Cet article n'apparaît pas dans l'app tant qu'il n'est pas corrigé.",
    severity: "warning",
    action:
      "Vérifiez l'article sur presidence.sn ; si la structure du site a changé, prévenez l'équipe technique.",
  },
  MEDIA_PROCESSING_FAILED: {
    what: "La photo d'un article n'a pas pu être récupérée ou préparée.",
    where: "Collecte automatique (photos)",
    impact: "L'article est publié sans photo ; le texte reste complet.",
    severity: "info",
    action: "Rien à faire : une nouvelle tentative a lieu au prochain passage.",
  },
  ADMIN_API_UNREACHABLE: {
    what: "L'administration n'arrive pas à joindre l'API.",
    where: "Centre d'administration, écran « État du service »",
    impact: "Les applications ne reçoivent probablement plus de nouvelles données.",
    severity: "critical",
    action:
      "Vérifiez que le serveur de l'API est démarré, puis vérifiez à nouveau. Si cela continue, prévenez l'équipe technique.",
  },
  ADMIN_API_INVALID_RESPONSE: {
    what: "L'API répond, mais pas dans le format attendu.",
    where: "Centre d'administration, écran « État du service »",
    impact: "Une mise à jour a peut-être été mal déployée.",
    severity: "warning",
    action: "Prévenez l'équipe technique.",
  },
  ADMIN_API_UNCONFIGURED: {
    what: "L'adresse de l'API n'est pas configurée dans l'administration.",
    where: "Centre d'administration (configuration)",
    impact: "L'état du service ne peut pas être vérifié.",
    severity: "warning",
    action: "Renseignez la variable API_URL de l'administration.",
  },
} as const satisfies Record<string, ErrorExplanation>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export interface ErrorDescription extends ErrorExplanation {
  code: string;
  /** False when the code is unknown: it must then be added to this catalog. */
  catalogued: boolean;
}

function isErrorCode(code: string): code is ErrorCode {
  return Object.hasOwn(ERROR_CATALOG, code);
}

/**
 * Plain-language description of any code, including codes reported at runtime
 * that are not catalogued yet (flagged so they get added, never hidden).
 */
export function describeError(code: string): ErrorDescription {
  if (isErrorCode(code)) {
    return { code, catalogued: true, ...ERROR_CATALOG[code] };
  }
  return {
    code,
    catalogued: false,
    what: "Erreur non encore répertoriée.",
    where: "Inconnu",
    impact: "À évaluer.",
    severity: "warning",
    action: "Signalez ce code à l'équipe technique pour qu'il soit ajouté au catalogue.",
  };
}
