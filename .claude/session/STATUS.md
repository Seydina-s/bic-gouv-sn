# STATUS — Bic Gouv SN

**Dernière mise à jour** : 01/10/2026 (11 h) · **Mode** : autonome jusqu'au 01/10 à 13 h, puis séance avec l'utilisateur : Opportunités, Participer, IA. Actions de l'utilisateur : `.claude/session/A-FAIRE-UTILISATEUR.md` (24 points, dont plusieurs réglés ; le n° 23 regroupe les choix autonomes à confirmer).

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + **4 contrôles verts** (qualité et tests, constructions avec **audit d'accessibilité** sur 91 écrans dont 29 à 320 px et **9 parcours de bout en bout**, secrets et dépendances, **conteneurs**).
- Articles : 970 (FR + WO), 36 avec leurs PDF officiels. Démarches : 718 fiches, 18 thèmes. Services : 880 proposés, vérification humaine dans la console.
- Nuit du 27 au 28/09 (PR #79 à #94) : voir l'historique du backlog (CSP, contrôle à distance, PDF officiels, audit d'accessibilité automatique…).
- Journée du 28/09 (PR #95 à #114) :
  - articles retirés par la Présidence **masqués** (décision de l'utilisateur), contrôle chaque nuit, onglet « Articles masqués » ;
  - collecte **ininterrompue** (réessais jusqu'à toutes les 10 min, rattrapage après panne) et **verrou d'instance unique** (3 collectes tournaient en même temps : corrigé, données intactes) ;
  - console : recherches sans résultat (seuil de 3), navigation groupée, état des protections des sources, **notifications à deux personnes** (envoi réel à brancher avec la version de test), **journal d'audit** avec contrôle d'intégrité ;
  - performances : lecture du stockage en cache, tri et extraits en cache, recherche tolérante aux fautes et réutilisée 60 s (liste ~30 ms, recherche répétée ~300 req/s ; `docs/capacite.md`) ;
  - fiabilité des contrôles : polices de la console dans le dépôt, démarrage de Chrome plus robuste ;
  - accessibilité : langue réellement affichée déclarée (page et articles en wolof) ;
  - app : préchargement de l'article probable suivant (jamais en économie de données) ;
  - notifications : compteur « à vérifier » dans la navigation, échec d'envoi noté dans l'historique.
- Soir du 28/09 (PR #115) : décisions de l'utilisateur consignées (banc d'essai wolof, parcours des démarches, écran « Comptes », compte Apple individuel).
- Nuit du 28 au 29/09 (PR #116 à #121) :
  - fiche démarche en **parcours visuel** (rubriques de la source reliées par un fil, dans leur ordre) ; documents à fournir en simple liste, **plus de cases à cocher** ;
  - console : écran **« Comptes »** (lien d'activation à usage unique, rôle, désactivation, second code, rien sur son propre compte, tout au journal) ; écritures des comptes sécurisées ;
  - **deux volets** sur tablette et pliable déplié pour les démarches et « Près de moi » ;
  - **parcours de bout en bout** dans la CI (ils ont révélé que l'audit validait, en local, un Accueil en erreur : cache corrigé) ;
  - **clés d'idempotence** sur les écritures (un formulaire envoyé deux fois n'agit qu'une fois) ; une seule notification en attente par article ;
  - protection du shell durcie (JavaScript en ligne avec accent grave refusé).
- Journée du 29/09 (PR #123 à #134), décisions de l'utilisateur de midi appliquées :
  - **garde-fous des secrets** (SEC-05) : fichiers de secrets illisibles pour les outils et l'IA, clé remplaçable sans rien casser (la clé locale exposée a été remplacée), doctrine de production (`docs/securite-des-secrets.md`) ;
  - **mot de passe oublié** (ADM-11) : nouveau lien d'activation, second code gardé ;
  - **statistiques anonymes** (ADM-12) : réglage dans l'app (désactivé par défaut) et **demande comme une permission** après un premier article (activation immédiate si oui), écran « Usage de l'application » dans la console, transparence (`docs/statistiques-anonymes.md`) ;
  - **conteneurs** API, console, collecte (`infra/`), exigés en CI ; **chiffrage de l'hébergement** (`docs/hebergement.md`, environ 65 €/mois au départ, une seule instance de l'API tant que SCALE-01 n'est pas fait) ;
  - **notifications push, partie serveur** (abonnements par rubrique, heures calmes, envoi Expo) ; l'écran de l'app attend la version de test ;
  - **objectif « moins de 2 minutes »** mesuré dans la console ; **contrôle à 320 px** ; **auto-vérification offensive** de l'API (défaut 500 corrigé) ; audit croisé AUD4 ; nettoyage des fichiers temporaires orphelins.
- Soir du 29/09 (PR #137 à #140), **préparation à plusieurs serveurs d'API** :
  - **SCALE-01** : sessions et étapes de connexion de la console, clés anti-doublons et limite de débit partagées dans **Redis** (`REDIS_URL`) ;
  - **SCALE-02** (tranches 1 à 3) : **PostgreSQL** entre dans l'API (`DATABASE_URL`, schéma mis à jour au démarrage) ; statistiques d'usage, recherches sans résultat et journal des erreurs **additionnés** en base par chaque serveur ; sans base, les fichiers restent utilisés ;
  - tout est testé en CI contre un vrai Redis et un vrai PostgreSQL 18 (PGlite en local) ; Redis et PostgreSQL ajoutés à `infra/docker/compose.yaml`.
- Nuit du 29 au 30/09 et matinée (PR #141 à #149) :
  - **SCALE-02** suite, avec l'accord de l'utilisateur : abonnements aux notifications, notifications de la console, comptes de l'équipe et **journal d'audit refusant en base toute modification** passent dans PostgreSQL ; commandes d'administration branchées sur la même base ;
  - **notifications automatiques** (décision de l'utilisateur, 1 h 20) : chaque nouvel article annoncé avec photo, premiers mots et source, dans la langue de chacun, hors heures calmes ; pause (éditeur) et reprise (administrateur) dans la console, 10 par heure au plus ; nombre de téléphones prévenus affiché ;
  - **app** : demande comme une permission, Réglages (notifications, heures calmes 22 h – 7 h par défaut, rubriques), ouverture de l'article au toucher ; actif dès que le projet EAS existe ;
  - envoi Expo à sa cadence officielle (600 par seconde) ; garde-fous des futures clés Apple et Firebase ; guide de la version de test complété (notifications) ; audit croisé AUD5.
- Après-midi et soirée du 30/09 (PR #151 à #156), version de test sur iPhone installée par l'utilisateur :
  - compilation iOS corrigée (sentry-cli introuvable avec pnpm, ERREURS.md) ;
  - **« Près de moi » carte d'abord** avec panneau glissant à trois hauteurs (Reanimated, @gorhom/bottom-sheet ; plafond de poids relevé à 7,5 Mo par l'utilisateur), **repères par type** (7 teintes et icônes, contrastes testés), **itinéraire dans Google Maps**, carte toujours claire ;
  - **barre de navigation** à pastille glissante ; **fondu** en fin de présentation ; **présentation en chemin** (direction A choisie parmi trois maquettes).
- Nuit du 30/09 au 01/10 (PR #157 à #161), mode autonome :
  - console : **téléphones abonnés** (totaux seulement) et **alerte rouge** dès 3 annonces automatiques en 30 minutes ;
  - Réglages › « Présentation de l'application » › **« Redémarrer »** (libellé de l'utilisateur) ;
  - « Près de moi » en **volet latéral** sur tablette, pliable déplié et téléphone en paysage ;
  - **journaux de l'API sans IP ni recherche** (minimisation) ; **inventaire des données** (`docs/confidentialite/`) ; **fichier des 271 textes à traduire en wolof** (`docs/traduction/`, `pnpm i18n:wolof`) ;
  - **dossier de cadrage** pour la séance de 13 h : `docs/cadrage/opportunites-participer-ia.md` ;
  - audit croisé AUD6 ; mesure du poids de l'app (Sentry ≈ 2 Mo de source, levier principal mais bloqué par PERF-03).
- Matin du 01/10 (PR #162 à #181), mode autonome :
  - **parcours de bout en bout n° 7** : « Redémarrer » la présentation depuis les Réglages, étape par étape, jusqu'à l'app ;
  - **audit d'accessibilité de chaque étape de la présentation** (clair, sombre, 320 px ; 92 écrans) : il a trouvé une carte de texte inatteignable au clavier, corrigée ;
  - console : **alerte d'afflux d'abonnements** (au moins 500 en 24 h et 5 fois le rythme habituel ; heure d'abonnement gardée à l'heure près, à confirmer) ; journal des erreurs : **« Marquer comme réglée »** (éditeurs, journal d'audit, l'erreur revient si elle se reproduit) ;
  - console : **résumé « À traiter »** en tête de l'accueil (erreurs en cours, alertes des notifications, notifications à vérifier, envoi en pause), chacun menant à sa page ; **procédure** pour les deux alertes des notifications (`docs/runbooks/notifications-alertes.md`) ;
  - **parcours de bout en bout n° 8** (marquer une erreur comme réglée) : il a trouvé une confirmation qui disparaissait aussitôt, corrigée (ERREURS.md) ;
  - tests de la logique des types partagés (couverture 83 → 88 %) ; **faux wolof retiré des données de test** (« [wo] … » à la place) ; catalogue wolof de l'interface vérifié vide, comme prévu ;
  - fin de matinée (PR #175 à #181) : correctifs des dépendances du serveur (Next 16.3.7, sharp, vitest ; rien côté app) ; **totaux d'abonnés gardés une minute** (le comptage complet aurait coûté cher à 20 millions) ; **parcours n° 9** (de « À traiter » à la notification en attente) ; **audit d'accessibilité 2,5 fois plus rapide en CI et plus strict** ; une erreur réglée ne s'affiche plus « En cours » ; **taille de la base à indexer** pour l'IA (environ 2 millions de jetons) dans le dossier de cadrage ; audit croisé AUD7 ;
  - « Près de moi » : avertissement de localisation à côté du volet latéral ;
  - protection du terminal : **toute poussée doit suivre le scanner de secrets** (deuxième entorse à cette règle, ERREURS.md) ;
  - dossier de cadrage : **ce que permet chaque portail d'Opportunités** (règles des robots, certificats : marchespublics.sn et directiondesbourses.sn bloquent une collecte sûre ; FONGIP confirmé).
- Contrôle complet : environ 1 200 tests verts, 9 parcours de bout en bout, 91 écrans audités.
- Incident du 29/09 : clé de l'API **locale** apparue dans la conversation ; remplacée le jour même (ERREURS.md).

## En attente de l'utilisateur
Voir `.claude/session/A-FAIRE-UTILISATEUR.md`. Toujours ouverts : compte Apple (en cours), vérification des services de Dakar, logo, identifiant de l'app, questions au BIC (et offre de Sénégal Numérique pour Diamniadio), budget d'hébergement (chiffrage prêt), jeton Sentry, Opportunités et Participer (plus tard), wolof (à la fin).

## Prochaine tâche
- **13 h, séance avec l'utilisateur** : dettes dans l'ordre Opportunités, Participer, intégration de l'IA, à partir du dossier `docs/cadrage/opportunites-participer-ia.md`.
- Ensuite, sur la version de test : QA-02, QA-03, QA-04, QA-09, AUD5-04, AUD6-02, AUD6-03, E2E-02, LIC-02, module iPhone pour la photo des notifications (AUD5-07, recompilation).
- Décisions attendues : points 19 (contenus publiés dans PostgreSQL), 20 (Firebase), 21 (envoi à l'échelle nationale), 22 (politique de confidentialité), confirmation de l'ordre des invitations et des heures calmes par défaut (AUD5-05) et des journaux sans IP (décision autonome du 01/10).
- QA-11 réglé (test instable : préparation trop lente sous charge).

## Services locaux (au 01/10, 5 h)
- API sur 3100 relancée sur `main` avec `PUSH_PROVIDER=expo` (toujours sur fichiers : ni Redis ni PostgreSQL installés sur la machine) ; console en développement sur 3001 ; Expo sur 8081 en mode version de test (`--dev-client`, `EXPO_PUBLIC_API_URL=http://192.168.1.14:3100`) ; export web de l'app servi sur 8084 (relais vers l'API) ; une seule collecte temps réel (verrou actif, contrôle des retraits chaque nuit ; elle nettoiera les fichiers temporaires orphelins à son prochain démarrage).
- Changer la clé locale des seconds codes : arrêter l'API, `pnpm --filter @bgs/api admin:rotate-key`, relancer (aucune clé n'est jamais affichée).
- Secrets : gitleaks toujours avec `--redact` et sur le commit (`gitleaks git`), jamais `gitleaks dir` sur le dépôt (ERREURS.md, 29/09).
- Arrêt de la collecte : chercher le processus dont la ligne de commande contient `cli/watch.ts` (arrêter la tâche pnpm ne suffit pas), puis vérifier qu'il n'en reste aucun avant de relancer.


## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (appeler par chemin complet). gitleaks : `C:\Users\HP\tools\gitleaks\gitleaks.exe`. pmtiles : `C:\Users\HP\tools\pmtiles\pmtiles.exe`.
- API locale : dans `apps/api`, `pnpm build` puis `PORT=3100 pnpm start`. Arrêter l'ancien processus `node … dist/server.mjs` avant de relancer (arrêter la tâche de fond ne suffit pas). **Le redémarrage déconnecte la console.**
- Audit d'accessibilité en local : `pnpm --filter @bgs/admin build`, `pnpm --filter @bgs/mobile export:web`, puis `pnpm a11y` (ports 3190-3192, données fictives jetables). Le build de la console n'interrompt pas le serveur de développement sur 3001.
- Fond de carte : `.data/tiles/senegal.pmtiles` (217 Mo) et `.data/map/` (`pnpm map:assets`) ; procédure `docs/runbooks/fond-de-carte.md`.
- Après un changement de branche dont le fichier de verrouillage diffère : `pnpm install --frozen-lockfile` avant toute commande (ERREURS.md, 27/09).
- Expo : pour Expo Go, `EXPO_PUBLIC_API_URL=http://192.168.1.14:3100 npx expo start --port 8081 --clear --go --offline` (sans `--lan`). Après toute installation de dépendances : arrêter l'ancien processus sur 8081, relancer, puis demander le paquet de contrôle.
- Vérification visuelle : export web + Chrome headless (`scratchpad/cdp-shot.mjs`). Données de test : toujours une copie jetable, jamais `.data/`.
- Pas de Python sur la machine : scripts en Node. Tout texte ou code contenant un accent grave, `$`, un antislash ou une séquence d'échappement s'écrit avec l'éditeur, jamais par le shell (ERREURS.md, 27/09 et 28/09).
