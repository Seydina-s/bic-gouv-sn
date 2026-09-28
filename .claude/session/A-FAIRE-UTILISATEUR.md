# À faire par l'utilisateur (reporté)

Liste unique de ce qui attend une action ou une décision de l'utilisateur. Reportée à sa demande le 27/09/2026 (16 h 30) : Claude continue sans ces éléments et complète cette liste au fil du travail. Rien ici ne bloque le développement.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 1 | Compte Apple Developer (99 USD/an), puis suivre `docs/guides/installer-la-version-de-test-iphone.md` | Seul moyen de voir la carte native sur iPhone. Attendre ne crée aucun incident : la liste reste dans Expo Go, et une version Android de test est gratuite | A-03, MAP-06 |
| 2 | Vérifier les services de la région de Dakar dans la console (vérifier, écarter, corriger, déplacer, ajouter) | Tant que rien n'est vérifié, la liste et la carte de « Près de moi » restent vides dans l'app | AUD3-06 |
| 3 | Logo officiel, icônes d'app, écran de lancement | Icônes génériques en attendant ; le splash animé attend le logo | A-01, SPLASH-01 |
| 4 | Identifiant officiel de l'app, à valider avec le BIC | Nécessaire avant toute publication sur les stores (pas pour la version de test) | A-02 |
| 5 | 🔄 **Décidé le 28/09 : pas de rédacteur humain.** Fournir les solutions trouvées (traduction, transcription et voix naturelle en wolof) pour un banc d'essai sur nos contenus, puis choisir la meilleure | Les textes d'interface restent en français (repli signalé) d'ici là | W-01 |
| 6 | Questions au BIC : autorisation d'utiliser l'API de presidence.sn, flux à chaque publication, reprise du wolof, licence du code, autorisation écrite pour les stores | Conditions de mise en ligne publique | L-01, L-02 |
| 7 | Budget d'hébergement (région proche de l'Afrique de l'Ouest + CDN) | Conditionne la mise en production (API, carte, sauvegardes hors machine) | S1-02, MAP-10, DATA-01 |
| 8 | Contenu de la section « Opportunités » — à traiter plus tard, ensemble (28/09) | Section en attente de cadrage | O-01 |
| 9 | Périmètre de « Participer » (sondages, signalements) — à traiter plus tard, ensemble (28/09) | Onglet « bientôt disponible » en attendant | P1 |
| 10 | ✅ **Décidé le 28/09 : masquer** l'article retiré (et un onglet de traçabilité dans la console). — Choisir le sort d'un article **retiré** par la Présidence : le masquer dans l'app (proposé, conforme à la règle « si l'information n'existe pas dans la source, l'app ne l'affiche pas ») ou l'afficher avec la mention « retiré par la source » | Aujourd'hui un article retiré resterait affiché. Relevé réel du 28/09 : **aucun retrait** pour l'instant (et 74 anciennes versions absentes de la liste officielle mais toujours en ligne, qui ne seront jamais masquées sans seconde lecture). Rien ne presse, mais le choix est nécessaire avant la mise en ligne publique | ING-03 |
| 11 | Créer un jeton d'accès Sentry (lecture des erreurs) et l'ajouter aux secrets GitHub / EAS (jamais dans la conversation) | Sans lui : pas de source maps des plantages de l'app, et le journal des erreurs de la console ne montre pas encore les plantages de l'app | MON-01, ADM-04 |
| 12 | ✅ **Décidé le 28/09 : option (a)**, et plus de cases à cocher sur les documents à fournir. — Choisir comment présenter les démarches « étape par étape » (CLAUDE.md, P1) : les fiches d'e-senegal.sn sont écrites en questions-réponses (qui, documents, coût, délai, où) et non en étapes — seules 10 fiches sur 718 ont une liste numérotée. Options : (a) montrer ces rubriques comme un parcours visuel dans l'ordre de la fiche, sans rien ajouter ; (b) faire rédiger les étapes par une personne et les valider dans la console ; (c) attendre un format par étapes de la source | Découper nous-mêmes en étapes serait inventer un contenu, ce que la règle d'exactitude interdit | DEM (P1) |

Décisions déjà données le 27/09/2026 : redémarrer l'API locale quand c'est utile (accordé) ; compte Apple reporté.

Mise à jour du 28/09/2026 (fin de la nuit autonome) : points 10 et 11 ajoutés ; aucun point ancien n'est réglé.

Mise à jour du 28/09/2026 (après-midi) : point 10 décidé (masquer, fait) ; recherches sans résultat décidées (seuil de 3, fait) ; point 12 ajouté.
