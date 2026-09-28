# À faire par l'utilisateur (reporté)

Liste unique de ce qui attend une action ou une décision de l'utilisateur. Reportée à sa demande le 27/09/2026 (16 h 30) : Claude continue sans ces éléments et complète cette liste au fil du travail. Rien ici ne bloque le développement.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 1 | Compte Apple Developer (99 USD/an), puis suivre `docs/guides/installer-la-version-de-test-iphone.md` | Seul moyen de voir la carte native sur iPhone. Attendre ne crée aucun incident : la liste reste dans Expo Go, et une version Android de test est gratuite | A-03, MAP-06 |
| 2 | Vérifier les services de la région de Dakar dans la console (vérifier, écarter, corriger, déplacer, ajouter) | Tant que rien n'est vérifié, la liste et la carte de « Près de moi » restent vides dans l'app | AUD3-06 |
| 3 | Logo officiel, icônes d'app, écran de lancement | Icônes génériques en attendant ; le splash animé attend le logo | A-01, SPLASH-01 |
| 4 | Identifiant officiel de l'app, à valider avec le BIC | Nécessaire avant toute publication sur les stores (pas pour la version de test) | A-02 |
| 5 | Personne qui rédige et valide le wolof de l'interface | Les textes d'interface restent en français (repli signalé) | W-01 |
| 6 | Questions au BIC : autorisation d'utiliser l'API de presidence.sn, flux à chaque publication, reprise du wolof, licence du code, autorisation écrite pour les stores | Conditions de mise en ligne publique | L-01, L-02 |
| 7 | Budget d'hébergement (région proche de l'Afrique de l'Ouest + CDN) | Conditionne la mise en production (API, carte, sauvegardes hors machine) | S1-02, MAP-10, DATA-01 |
| 8 | Contenu de la section « Opportunités » | Section en attente de cadrage | O-01 |
| 9 | Périmètre de « Participer » (sondages, signalements) | Onglet « bientôt disponible » en attendant | P1 |
| 10 | Choisir le sort d'un article **retiré** par la Présidence : le masquer dans l'app (proposé, conforme à la règle « si l'information n'existe pas dans la source, l'app ne l'affiche pas ») ou l'afficher avec la mention « retiré par la source » | Aujourd'hui un article retiré resterait affiché ; la détection (ING-03) est prête à être construite dès ce choix | ING-03 |
| 11 | Créer un jeton d'accès Sentry (lecture des erreurs) et l'ajouter aux secrets GitHub / EAS (jamais dans la conversation) | Sans lui : pas de source maps des plantages de l'app, et le journal des erreurs de la console ne montre pas encore les plantages de l'app | MON-01, ADM-04 |

Décisions déjà données le 27/09/2026 : redémarrer l'API locale quand c'est utile (accordé) ; compte Apple reporté.

Mise à jour du 28/09/2026 (fin de la nuit autonome) : points 10 et 11 ajoutés ; aucun point ancien n'est réglé.
