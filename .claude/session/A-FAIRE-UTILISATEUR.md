# À faire par l'utilisateur (reporté)

Liste unique de ce qui attend une action ou une décision de l'utilisateur. Reportée à sa demande le 27/09/2026 (16 h 30) : Claude continue sans ces éléments et complète cette liste au fil du travail. Rien ici ne bloque le développement.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 1 | Compte Apple Developer (99 USD/an), puis suivre `docs/guides/installer-la-version-de-test-iphone.md` | Seul moyen de voir la carte native sur iPhone. Attendre ne crée aucun incident : la liste reste dans Expo Go, et une version Android de test est gratuite | A-03, MAP-06 |
| 2 | Vérifier les services de la région de Dakar dans la console (vérifier, écarter, corriger, déplacer, ajouter) | Tant que rien n'est vérifié, la liste et la carte de « Près de moi » restent vides dans l'app | AUD3-06 |
| 3 | Logo officiel, icônes d'app, écran de lancement | Icônes génériques en attendant ; le splash animé attend le logo | A-01, SPLASH-01 |
| 4 | Identifiant officiel de l'app, à valider avec le BIC | Nécessaire avant toute publication sur les stores (pas pour la version de test) | A-02 |
| 5 | ⏸ **Reporté à la fin (29/09).** 🔄 **Décidé le 28/09 : pas de rédacteur humain.** Fournir les solutions trouvées (traduction, transcription et voix naturelle en wolof) pour un banc d'essai sur nos contenus, puis choisir la meilleure | Les textes d'interface restent en français (repli signalé) d'ici là | W-01 |
| 6 | Questions au BIC : autorisation d'utiliser l'API de presidence.sn, flux à chaque publication, reprise du wolof, licence du code, autorisation écrite pour les stores | Conditions de mise en ligne publique | L-01, L-02 |
| 7 | 🔄 **Chiffrage prêt (29/09) : docs/hebergement.md** — option A (Paris + CDN à Dakar) environ 65 €/mois au départ ; option souveraine (Diamniadio) à demander à Sénégal Numérique. Budget d'hébergement (région proche de l'Afrique de l'Ouest + CDN) | Conditionne la mise en production (API, carte, sauvegardes hors machine) | S1-02, MAP-10, DATA-01 |
| 8 | Contenu de la section « Opportunités » — à traiter plus tard, ensemble (28/09) | Section en attente de cadrage | O-01 |
| 9 | Périmètre de « Participer » (sondages, signalements) — à traiter plus tard, ensemble (28/09) | Onglet « bientôt disponible » en attendant | P1 |
| 10 | ✅ **Décidé le 28/09 : masquer** l'article retiré (et un onglet de traçabilité dans la console). — Choisir le sort d'un article **retiré** par la Présidence : le masquer dans l'app (proposé, conforme à la règle « si l'information n'existe pas dans la source, l'app ne l'affiche pas ») ou l'afficher avec la mention « retiré par la source » | Aujourd'hui un article retiré resterait affiché. Relevé réel du 28/09 : **aucun retrait** pour l'instant (et 74 anciennes versions absentes de la liste officielle mais toujours en ligne, qui ne seront jamais masquées sans seconde lecture). Rien ne presse, mais le choix est nécessaire avant la mise en ligne publique | ING-03 |
| 11 | Créer un jeton d'accès Sentry (lecture des erreurs) et l'ajouter aux secrets GitHub / EAS (jamais dans la conversation) | Sans lui : pas de source maps des plantages de l'app, et le journal des erreurs de la console ne montre pas encore les plantages de l'app | MON-01, ADM-04 |
| 12 | ✅ **Décidé le 28/09 : option (a)**, et plus de cases à cocher sur les documents à fournir. — Choisir comment présenter les démarches « étape par étape » (CLAUDE.md, P1) : les fiches d'e-senegal.sn sont écrites en questions-réponses (qui, documents, coût, délai, où) et non en étapes — seules 10 fiches sur 718 ont une liste numérotée. Options : (a) montrer ces rubriques comme un parcours visuel dans l'ordre de la fiche, sans rien ajouter ; (b) faire rédiger les étapes par une personne et les valider dans la console ; (c) attendre un format par étapes de la source | Découper nous-mêmes en étapes serait inventer un contenu, ce que la règle d'exactitude interdit | DEM (P1) |
| 13 | ✅ **Validé le 29/09.** — Proposition ADM-11 : **mot de passe oublié**. Aujourd’hui, aucune solution n’existe (ni dans la console ni en ligne de commande). Proposé : un administrateur crée un nouveau lien d’activation pour un compte déjà actif ; l’ancien mot de passe cesse de fonctionner, les sessions sont fermées, l’action va au journal | Sans cela, une personne qui oublie son mot de passe ne peut plus entrer | ADM-11 |
| 14 | 🔄 **Décidé le 29/09 : garde-fous exigés (SEC-05).** — Pour information (incident du 29/09) : la clé secrète de l'API **locale** (`ADMIN_SECRET_KEY`) est apparue dans la conversation lors d'une vérification. Rien n'a été publié, la clé n'est pas dans le dépôt. La production aura sa propre clé, générée au déploiement. Option : la changer aussi en local (vous devrez alors réactiver votre second code à la connexion suivante) | Aucun risque public ; précaution à décider | ERREURS.md (29/09) |
| 15 | ✅ **Validé le 29/09 (compteurs anonymes).** — Décider des **tableaux de bord d'usage** de la console (CLAUDE.md : utilisateurs actifs, installations, rétention, régions, contenus les plus lus). Ils demandent de mesurer l'usage de l'app : quoi mesurer, avec quel consentement, et quel outil (ex. PostHog auto-hébergé). Cela touche aux données personnelles : c'est à vous de choisir. Proposition prête à discuter : des compteurs agrégés et anonymes, sans identifiant de personne ni d'appareil, comme pour les recherches sans résultat | Sans décision, la console n'affiche pas ces indicateurs | ADM-12 |

Décisions déjà données le 27/09/2026 : redémarrer l'API locale quand c'est utile (accordé) ; compte Apple reporté.

Mise à jour du 28/09/2026 (fin de la nuit autonome) : points 10 et 11 ajoutés ; aucun point ancien n'est réglé.

Mise à jour du 28/09/2026 (après-midi) : point 10 décidé (masquer, fait) ; recherches sans résultat décidées (seuil de 3, fait) ; point 12 ajouté.

Mise à jour du 29/09/2026 (nuit autonome) : points 12 (parcours des démarches, fait) et écran « Comptes » (fait) réglés ; point 13 ajouté.

Mise à jour du 29/09/2026 (fin de la nuit autonome, 10 h) : points 14 (incident de clé locale) et 15 (tableaux de bord d’usage) ajoutés.

Mise à jour du 29/09/2026 (midi) : décisions de l’utilisateur sur les points 13 (validé), 14 (garde-fous exigés), 15 (validé) et 5 (banc d’essai wolof reporté à la fin).

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 16 | ✅ **Validé et fait le 29/09.** — Autoriser l'ajout du contrôle « Container images » aux contrôles exigés avant toute fusion dans `main` (réglage du dépôt GitHub, que je peux faire sur votre accord) | Aujourd'hui, une image cassée serait signalée mais n'empêcherait pas la fusion | AUD4-04 |
| 17 | ✅ **Validé et fait le 29/09** (demande comme une permission, activation immédiate). — Dire si l'on prépare une invitation, une seule fois et facile à refuser, à activer les statistiques anonymes (texte et écran vous seront soumis avant toute mise en place) | Sans elle, peu de personnes les activeront et les tableaux de bord resteront maigres | AUD4-03 |

Mise à jour du 30/09/2026 (minuit, mode autonome) : point 18 ajouté.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 18 | ✅ **Validé le 30/09 (1 h).** — Autoriser la suite du passage à PostgreSQL pour les données sensibles, dans cet ordre : (a) abonnements aux notifications (jeton de l'appareil, rubriques, heures calmes) ; (b) notifications préparées et décidées dans la console ; (c) comptes de l'équipe et journal d'audit. Ce qui est enregistré ne change pas, seulement l'endroit où c'est rangé. Le déplacement est testé en CI sur un vrai PostgreSQL et reste réversible. | Rien ne presse tant qu'il n'y a qu'un serveur d'API. Avant d'en ajouter un second, ces données doivent être en base commune, sinon elles s'écraseraient | SCALE-02 |

Mise à jour du 30/09/2026 (3 h, mode autonome) : point 19 ajouté.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 19 | Autoriser le passage à PostgreSQL des **contenus publiés** : articles et démarches (écrits par la collecte), services de la carte, thèmes des démarches et contrôle à distance (écrits dans la console). Même contenu, même historique des versions, autre emplacement ; testé en CI sur un vrai PostgreSQL. | Dernière étape avant de pouvoir ajouter un second serveur d'API. Rien ne presse tant qu'un seul serveur suffit | SCALE-02 |

Mise à jour du 30/09/2026 (4 h, mode autonome) : point 20 ajouté.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 20 | Pour les notifications sur Android : créer un projet **Firebase** (gratuit), me donner le fichier `google-services.json` (public), et envoyer vous-même la clé secrète du compte de service à Expo. Étapes dans `docs/guides/installer-la-version-de-test-iphone.md`, partie « Notifications ». Sur iPhone, rien de plus que le compte Apple : répondre oui aux questions sur les notifications lors de la première compilation. | Sans cela, les notifications ne peuvent pas arriver sur Android | PUSH-04 |

Mise à jour du 30/09/2026 (6 h 15, mode autonome) : point 21 ajouté.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 21 | Choisir comment envoyer les notifications **à l'échelle nationale**. Le service d'Expo, en place, accepte au plus 600 notifications par seconde (limite officielle) : un article met environ 3 minutes à atteindre 100 000 téléphones, mais environ 9 heures pour 20 millions. Recommandation : garder Expo pour le pilote, puis passer aux **sujets Firebase** (un seul envoi par article et par langue, Google se charge de la diffusion, gratuit) avant le lancement national. Le code est prêt à changer de fournisseur (interface commune). | Aucun effet tant que le nombre d'abonnés reste sous quelques centaines de milliers | AUD5-01 |

Mise à jour du 01/10/2026 (5 h, mode autonome) : point 22 ajouté.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 22 | Faire rédiger la **politique de confidentialité** par un juriste, à partir de l'inventaire factuel des données (`docs/confidentialite/inventaire-des-donnees.md`), et préparer la déclaration à la CDP | Exigée par Google Play et l'App Store avant toute publication, et par la loi n° 2008-12 | L-01, A-02 |

Mise à jour du 01/10/2026 (9 h 30, mode autonome) : points 23 et 24 ajoutés.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 23 | **Confirmer (ou corriger) les choix faits en autonomie cette nuit** : (a) invitations dans l'app, notifications d'abord et statistiques une autre fois, heures calmes 22 h – 7 h activées par défaut ; (b) journaux de l'API sans adresse IP ni mots cherchés ; (c) heure du premier abonnement aux notifications gardée, à l'heure près, pour l'alerte d'afflux (seuils : 500 en 24 h et 5 fois le rythme habituel) ; (d) « Marquer comme réglée » dans le journal des erreurs réservé aux éditeurs et administrateurs. Tout est réversible. | Rien ne casse si ça attend : ces choix sont déjà en place et consignés dans `decisions.md` | AUD5-05, AUD5-03, ADM-04 |
| 24 | Autoriser la **réparation de la compétence de design ui-ux-pro-max** : ses dossiers de données et de scripts pointent vers un dépôt tiers qui n'est pas installé. Python est déjà présent (3.14). L'installation consiste à télécharger ce dépôt (gratuit). | Sans elle, cette compétence ne donne que ses règles écrites, pas ses recherches de palettes et de typographies | D-03 |

Mise à jour du 01/10/2026 (19 h, mode autonome) : point 23 validé (14 h 40) ; points 25 à 27 ajoutés.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 25 | **Essayer l'app sur l'iPhone**, ordinateur allumé et sur le même Wi-Fi : ouvrir l'app de test, qui se recharge en **mode optimisé** (plus rapide que d'habitude). Vérifier : plus d'erreurs rouges dans « Près de moi » ; l'invitation à la localisation sur l'accueil (les invitations déjà répondues ne reviennent pas) ; la réaction au toucher et l'ouverture des onglets ; la ligne « Position » des Réglages | Mesure réelle de la fluidité ; seul un téléphone le montre | PERM-01, PERF-04, AUD8-03 |
| 26 | Relire les **textes de l'invitation à la localisation** : « Voir les services près de vous ? », « Oui, me localiser », « Non merci » | Écrits en autonomie | AUD8-04 |
| 27 | Choisir l'**hébergement de l'API** (chiffrage prêt, `docs/hebergement.md`) : sans API en HTTPS, impossible de produire une version de test optimisée qui marche sans l'ordinateur | Bloque aussi la mise en ligne | S1-02, AUD8-05 |

Mise à jour du 02/10/2026 (0 h 30, mode autonome) : points 28 à 31 ajoutés.

| # | Quoi | Pourquoi / effet si ça attend | Réf. backlog |
|---|---|---|---|
| 28 | **Nouvelle compilation de la version de test** (EAS, lancée par vous : `docs/guides/installer-la-version-de-test-iphone.md`) | Sans elle : pas de photo dans les signalements (le module photo n'est pas dans l'app installée) et l'écran natif garde l'image du modèle Expo. Elle servira aussi pour le logo et la photo des notifications iPhone | PART-02, AUD9-04 |
| 29 | **Opportunités** : confirmer les portails officiels comme sources (domaines .gouv.sn, DER/FJ, ADEPME, FONGIP, 3FPT, ARMP, bourses), dire qui saisit et qui vérifie dans la console, et autoriser ou non la collecte automatique (DER/FJ et ADEPME d'abord) | La section de l'accueil reste vide tant que rien n'est publié | OPP-02, AUD9-05 |
| 30 | **Participer** : confirmer la conservation (un an, puis effacement), les types de problèmes (voirie, éclairage, salubrité, eau, autre) et à qui transmettre les signalements (mairies, ONAS, SENELEC, SEN'EAU… ?) | Aujourd'hui, seule l'équipe les lit dans la console ; la déclaration à la CDP (point 22) doit mentionner ces données | PART-02, AUD9-03 |
| 31 | **Logo et écran de démarrage** : fournir les fichiers décrits dans `docs/guides/logo-et-ecran-de-demarrage.md` (des SVG de préférence) et répondre aux 4 questions de la fiche | L'app garde les icônes du modèle Expo ; l'écran de démarrage montre le baobab seul | A-01 |
| 32 | **Urgent : décider pour l'alerte de sécurité node-forge.** Une faille (signature RSA mal vérifiée, gravité haute) est publiée dans une brique de l'**outil de fabrication** d'Expo, pas dans l'app installée sur les téléphones, et **aucune correction n'existe encore**. Le contrôle « Secrets et dépendances » la refuse, donc **plus aucune PR ne peut être fusionnée**. Choix : (a) autoriser une exception limitée à cette seule alerte, notée dans le dépôt et revue à chaque mise à jour d'Expo (recommandé) ; (b) attendre une correction d'Expo, sans date | Bloque toutes les fusions depuis le 02/10 vers 0 h ; le travail continue sur des branches en attente | SEC-06 |
