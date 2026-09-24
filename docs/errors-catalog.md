# Catalogue des erreurs

<!-- Généré depuis packages/shared-types/src/errors/error-catalog.ts : ne pas modifier à la main. -->
<!-- Mise à jour : pnpm errors:doc -->

Chaque erreur technique de la plateforme a ici son explication en français simple, affichée telle quelle dans le journal des erreurs de l'administration. Un code absent de ce catalogue est signalé « non répertorié » pour être ajouté.

Gravité : 🔴 utilisateurs bloqués · 🟡 fonctionnement dégradé ou à surveiller · 🟢 information.

| Code | Gravité | Quoi | Où | Impact | Que faire |
|---|---|---|---|---|---|
| `RESILIENCE_TIMEOUT` | 🟡 Jaune | Un service extérieur a mis trop de temps à répondre. | Appel à un service extérieur (source officielle, voix, IA, notifications…) | L'opération concernée n'a pas abouti ; l'app affiche la dernière version connue. | Si cela se répète, vérifiez l'état du service concerné dans la supervision. |
| `RESILIENCE_CIRCUIT_OPEN` | 🔴 Rouge | Un service extérieur est mis en pause après plusieurs échecs de suite. | Supervision des dépendances | La fonction qui en dépend passe en mode dégradé jusqu'au prochain essai automatique. | Vérifiez que le service concerné fonctionne ; la reprise est automatique. |
| `RESILIENCE_ABORTED` | 🟢 Vert | Une opération a été annulée avant la fin, par exemple parce que l'écran a été fermé. | App ou serveur | Aucun : c'est un comportement normal. | Rien à faire. |
| `API_CONFIG_INVALID` | 🔴 Rouge | Le serveur de l'API ne peut pas démarrer : sa configuration est incorrecte. | Serveur de l'API (démarrage) | Toutes les applications sont privées de nouvelles données. | Corrigez la variable de configuration indiquée dans le message, puis redémarrez. |
| `ROUTE_NOT_FOUND` | 🟢 Vert | Une adresse inexistante de l'API a été demandée. | API publique | En général aucun ; en grand nombre, peut signaler une app trop ancienne ou un abus. | Rien à faire, sauf si le nombre augmente brutalement. |
| `REQUEST_INVALID` | 🟢 Vert | L'API a reçu une demande mal formée. | API publique | La demande concernée est refusée. | Si cela vient de l'app officielle, prévenez l'équipe technique. |
| `INTERNAL_ERROR` | 🔴 Rouge | Une erreur inattendue s'est produite dans l'API. | API publique | La demande concernée a échoué pour l'utilisateur. | Transmettez l'identifiant de la requête à l'équipe technique. |
| `ADMIN_API_UNREACHABLE` | 🔴 Rouge | L'administration n'arrive pas à joindre l'API. | Centre d'administration, écran « État du service » | Les applications ne reçoivent probablement plus de nouvelles données. | Vérifiez que le serveur de l'API est démarré, puis vérifiez à nouveau. Si cela continue, prévenez l'équipe technique. |
| `ADMIN_API_INVALID_RESPONSE` | 🟡 Jaune | L'API répond, mais pas dans le format attendu. | Centre d'administration, écran « État du service » | Une mise à jour a peut-être été mal déployée. | Prévenez l'équipe technique. |
| `ADMIN_API_UNCONFIGURED` | 🟡 Jaune | L'adresse de l'API n'est pas configurée dans l'administration. | Centre d'administration (configuration) | L'état du service ne peut pas être vérifié. | Renseignez la variable API_URL de l'administration. |
