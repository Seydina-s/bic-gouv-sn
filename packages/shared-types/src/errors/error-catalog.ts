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
  NEWS_WITHDRAWN: {
    what: "Un article demandé a été retiré du site de la Présidence ; l'app ne le montre plus.",
    where: "API publique, actualités",
    impact: "L'utilisateur voit « Cet article a été retiré par la Présidence ».",
    severity: "info",
    action: "Rien à faire : c'est le masquage voulu d'un article retiré par la source.",
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
  MAP_UNAVAILABLE: {
    what: "Le fond de carte n'est pas disponible : le fichier des tuiles du Sénégal manque sur le serveur.",
    where: "API publique (/v1/map)",
    impact:
      "La carte de « Près de moi » reste vide ; la liste des services et les itinéraires fonctionnent toujours.",
    severity: "warning",
    action: "Replacez le fichier des tuiles (procédure « fond de carte ») puis redémarrez l'API.",
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
  NOTIFICATION_SAME_PERSON: {
    what: "Une personne a voulu valider une notification qu'elle avait elle-même préparée.",
    where: "Centre d'administration, notifications",
    impact: "La validation a été refusée : un envoi national demande deux personnes.",
    severity: "info",
    action: "Demandez à une autre personne de l'équipe de vérifier et valider la notification.",
  },
  NOTIFICATION_NOT_PENDING: {
    what: "Une notification déjà validée ou annulée a été validée ou annulée une seconde fois.",
    where: "Centre d'administration, notifications",
    impact: "Rien n'a été modifié ; la première décision reste valable.",
    severity: "info",
    action: "Rechargez la page : une autre personne a sans doute déjà décidé.",
  },
  NOTIFICATION_ALREADY_PENDING: {
    what: "Une notification a été préparée pour un article qui en avait déjà une en attente de vérification.",
    where: "Centre d'administration, notifications",
    impact: "Rien n'a été préparé : le même article ne peut pas partir deux fois à tout le pays.",
    severity: "info",
    action: "Validez ou annulez la notification déjà en attente pour cet article.",
  },
  NOTIFICATION_NOT_FOUND: {
    what: "Une notification demandée n'existe pas.",
    where: "Centre d'administration, notifications",
    impact: "L'action a été refusée ; rien n'a été modifié.",
    severity: "info",
    action: "Rechargez la page des notifications.",
  },
  ERROR_GROUP_NOT_FOUND: {
    what: "Une erreur à marquer comme réglée n'est plus dans le journal.",
    where: "Centre d'administration, journal des erreurs",
    impact: "Rien n'a été modifié : seules les 300 erreurs les plus récentes sont gardées.",
    severity: "info",
    action: "Rechargez le journal des erreurs.",
  },
  OPPORTUNITY_NOT_FOUND: {
    what: "Une opportunité demandée n'existe pas.",
    where: "Centre d'administration, opportunités",
    impact: "L'action a été refusée ; rien n'a été modifié.",
    severity: "info",
    action: "Rechargez la page des opportunités.",
  },
  OPPORTUNITY_NOT_PENDING: {
    what: "Une opportunité déjà publiée ou retirée a été publiée ou retirée une seconde fois.",
    where: "Centre d'administration, opportunités",
    impact: "Rien n'a été modifié ; la première décision reste valable.",
    severity: "info",
    action: "Rechargez la page : une autre personne a sans doute déjà décidé.",
  },
  OPPORTUNITY_SAME_PERSON: {
    what: "Une personne a voulu publier une opportunité qu'elle avait elle-même préparée.",
    where: "Centre d'administration, opportunités",
    impact: "La publication a été refusée : une seconde personne doit vérifier.",
    severity: "info",
    action: "Demandez à une autre personne de l'équipe de vérifier et publier l'opportunité.",
  },
  PARTICIPATION_CLOSED: {
    what: "Un message ou un signalement a été envoyé alors que Participer est coupé dans le contrôle à distance.",
    where: "Application, Participer",
    impact: "L'envoi a été refusé ; l'app indique que la fonction est momentanément indisponible.",
    severity: "info",
    action:
      "Rien à faire tant que Participer doit rester coupé ; sinon, rallumez-le dans « Contrôle à distance ».",
  },
  ASSISTANT_OFF: {
    what: "Une question a été posée à l'assistant alors qu'il est coupé dans le contrôle à distance.",
    where: "Application, Assistant",
    impact:
      "La question a été refusée ; l'app indique que l'assistant est momentanément indisponible.",
    severity: "info",
    action:
      "Rien à faire tant que l'assistant doit rester coupé ; sinon, rallumez-le dans « Contrôle à distance ».",
  },
  ASSISTANT_MODEL_FAILED: {
    what: "L'assistant n'a pas pu obtenir de réponse du service d'intelligence artificielle.",
    where: "Application, Assistant (service Claude d'Anthropic)",
    impact:
      "La personne voit que l'assistant est momentanément indisponible ; le reste de l'app fonctionne normalement.",
    severity: "warning",
    action:
      "Si cela se répète, vérifiez la clé d'accès et le crédit du compte Anthropic, puis l'état du service dans la supervision.",
  },
  ASSISTANT_ANSWER_REJECTED: {
    what: "Une réponse de l'assistant a été écartée car elle ne citait pas correctement les sources officielles.",
    where: "Application, Assistant",
    impact:
      "La personne a lu que la base officielle ne contient pas la réponse : rien de non sourcé n'a été affiché.",
    severity: "info",
    action:
      "Rien à faire si c'est ponctuel ; si le nombre augmente, signalez-le à l'équipe technique.",
  },
  ASSISTANT_LIMIT_REACHED: {
    what: "Le nombre de questions prévu pour le mois est atteint : l'assistant est en pause.",
    where: "Application, Assistant",
    impact:
      "Les personnes lisent que l'assistant reprendra le 1er du mois prochain ; le reste de l'app fonctionne.",
    severity: "warning",
    action:
      "Pour reprendre avant, augmentez la limite mensuelle dans la page « Assistant » (cela augmente le coût).",
  },
  PARTICIPATION_NOT_FOUND: {
    what: "Un message, un signalement ou une photo demandés n'existent pas (ou plus).",
    where: "Centre d'administration, participation",
    impact: "Rien n'a été modifié ; les messages sont effacés au bout d'un an.",
    severity: "info",
    action: "Rechargez la page de la participation.",
  },
  PARTICIPATION_PHOTO_INVALID: {
    what: "Une photo envoyée avec un signalement n'a pas pu être lue.",
    where: "Application, Participer",
    impact:
      "Le signalement n'a pas été enregistré ; la personne voit un message lui proposant de réessayer sans photo.",
    severity: "info",
    action:
      "Rien à faire si c'est ponctuel ; si cela se répète, vérifiez le format des photos envoyées par l'app.",
  },
  NOTIFICATION_ARTICLE_UNKNOWN: {
    what: "Une notification a été préparée pour un article introuvable ou retiré.",
    where: "Centre d'administration, notifications",
    impact: "Rien n'a été préparé : on n'annonce qu'un article officiel publié.",
    severity: "info",
    action: "Choisissez un article dans la liste proposée.",
  },
  ADMIN_FORBIDDEN: {
    what: "Un compte a tenté une action que son rôle ne permet pas.",
    where: "Centre d'administration",
    impact: "L'action a été refusée ; rien n'a été modifié.",
    severity: "warning",
    action:
      "Si la personne a besoin de ce droit, un administrateur change son rôle ; sinon, consultez le journal d'audit.",
  },
  ACCOUNT_NOT_FOUND: {
    what: "Un compte d'administration demandé n'existe pas.",
    where: "Centre d'administration, comptes",
    impact: "L'action a été refusée ; rien n'a été modifié.",
    severity: "info",
    action: "Rechargez la page des comptes.",
  },
  ACCOUNT_SELF: {
    what: "Un administrateur a voulu changer son propre compte (rôle, désactivation ou second code).",
    where: "Centre d'administration, comptes",
    impact:
      "L'action a été refusée : on ne peut pas se retirer ses propres droits, ce qui garantit qu'un administrateur reste actif.",
    severity: "info",
    action: "Demandez à un autre administrateur de faire ce changement.",
  },
  ACCOUNT_EMAIL_TAKEN: {
    what: "Un compte a été créé avec une adresse e-mail déjà utilisée par un autre compte.",
    where: "Centre d'administration, comptes",
    impact: "Rien n'a été créé : une adresse ne sert qu'à un seul compte.",
    severity: "info",
    action:
      "Vérifiez l'adresse ; si la personne a déjà un compte, changez plutôt son rôle ou réactivez-le.",
  },
  ACCOUNT_ALREADY_ACTIVE: {
    what: "Un nouveau lien d'activation a été demandé pour un compte dont le mot de passe est déjà choisi.",
    where: "Centre d'administration, comptes",
    impact: "Aucun lien n'a été créé ; le compte reste inchangé.",
    severity: "info",
    action: "Rechargez la page : la personne a sans doute déjà activé son compte.",
  },
  ACCOUNT_ACTIVATION_INVALID: {
    what: "Un lien d'activation de compte est inconnu, déjà utilisé ou expiré (72 heures).",
    where: "Centre d'administration, activation d'un compte",
    impact: "La personne ne peut pas choisir son mot de passe avec ce lien.",
    severity: "info",
    action: "Un administrateur crée un nouveau lien depuis l'écran « Comptes » et le lui transmet.",
  },
  ACCOUNT_PASSWORD_REJECTED: {
    what: "Un mot de passe choisi à l'activation d'un compte est trop court ou trop long.",
    where: "Centre d'administration, activation d'un compte",
    impact: "Rien n'a été enregistré ; le lien reste valable.",
    severity: "info",
    action: "Choisissez une phrase de passe d'au moins 12 caractères.",
  },
  IDEMPOTENCY_KEY_REUSED: {
    what: "Une même clé de protection contre les doubles envois a servi pour deux demandes différentes.",
    where: "API (écritures : console, formulaires)",
    impact:
      "La seconde demande a été refusée ; la première reste valable, rien n'a été écrit deux fois.",
    severity: "warning",
    action:
      "Rechargez la page avant de recommencer ; si cela se répète, prévenez l'équipe technique.",
  },
  IDEMPOTENCY_IN_PROGRESS: {
    what: "Une demande a été envoyée une seconde fois alors que la première était encore en cours.",
    where: "API (écritures : console, formulaires)",
    impact: "Le second envoi a été ignoré : l'action ne sera faite qu'une fois.",
    severity: "info",
    action:
      "Rien à faire : attendez quelques secondes, puis rechargez la page pour voir le résultat.",
  },
  IDEMPOTENCY_KEY_INVALID: {
    what: "Une demande portait une clé de protection contre les doubles envois mal formée.",
    where: "API (écritures)",
    impact: "La demande a été refusée ; rien n'a été écrit.",
    severity: "warning",
    action: "Prévenez l'équipe technique : un outil envoie des demandes incorrectes.",
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
