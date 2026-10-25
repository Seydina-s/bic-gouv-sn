# Reprise — Bic Gouv SN

**Mis à jour** : 25/10/2026 18 h 15 · **Mode** : autonome prolongé (demande du 22/10 ; s'arrêter pour toute dépense imprévue, sécurité, données personnelles, contenu publié, action difficile à défaire) · **main** : #417 (+ correction des profils de test). Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001 (Next.js 16.4.1), surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081 (iPhone, copie `-demo`).
- Traduction automatique (#399, #401) : la surveillance traduit chaque nouvel article en anglais et en wolof toutes les 30 min, les fiches des démarches toutes les 6 h ; résultats dans `bgs-ops/logs/watch.log` (lignes `translation`). Les articles et fiches traduits n'affichent plus de mention (#416, décision du 25/10).
- Voix (serveur Hetzner `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français fini ; anglais en cours (877 restants le 25/10 à 18 h, `bgs-ops/logs/voices-en.log` ; serveur parfois injoignable quelques minutes, retenté seul) ; wolof ensuite, à finir sur le futur serveur d'hébergement (décision du 22/10).
- Banc d'essai de l'assistant : chaque dimanche à 4 h (tâche Windows « BicGouvSN-BancEssai », `bgs-ops/bench.sh`) ; passage du 25/10 : 77 / 96, aucune réponse inventée ; #413 a corrigé une partie des faiblesses (contrôle : 28 / 39 contre 25). Contrôle rapide d'une correction avant fusion : `bash /c/Users/HP/bgs-ops/check-bench.sh <copie>` (≈ 0,17 $, remet seul les résultats du jour).
- « Signaler cette réponse » (AST-30e) : partie serveur en service (#417 : `POST /v1/assistant/flags`, liste `GET /admin/v1/assistant/flags`, 90 jours, effacement automatique). Le filtre public (`scripts/public-gate.mjs`) devra laisser passer cette route quand l'app l'appellera (son test compare les chemins appelés par l'app).
- Contenus refusés par les règles de collecte : `pnpm --filter @bgs/ingestion discard` les liste ; `--apply <id>` supprime (copie privée dans `.data/discarded-articles.json`). 4 supprimés le 25/10 (#415) ; un 5ᵉ attend l'utilisateur (point 68).
- Dernière mise à jour à distance de l'app : « Textes traduits sans la mention « Traduction automatique » » (#416). Version de développement iPhone compilée le 25/10, à installer par l'utilisateur (point 50).
- Modèle universel de prompt système pour tout nouveau projet : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` (v3 du 25/10 : ossature du document initial de l'utilisateur, 30 « suppositions » conditionnelles) ; y reporter chaque nouvelle règle de `~/.claude/ERREURS-GLOBALES.md`, sans détail propre au projet.

## En cours
Rien en cours d'écriture.

## Prochaines étapes (dans l'ordre)
1. AST-30e, suite : page « Réponses signalées » de la console (liste, sources, date) ; puis, dès que l'utilisateur a validé la phrase d'information (point 66), le bouton dans l'app (séquence Marketer → Copywriter → Design, CLAUDE.md §2 ; route ajoutée au filtre public) ; puis les questions signalées reposées au banc d'essai hebdomadaire.
2. AST-42 (backlog) : fiches de démarches mal trouvées pour les questions reformulées, refus trop littéraux (« Conseil de mercredi », visa Canada), titre d'article traité comme hors sujet. Extraits et réponses dans `.data/assistant/bench/2026-10-25.json` (`evidence`). Vérifier avec `check-bench.sh` avant la fusion ; pièges toujours à 15 / 15.
3. QA-14 : types des scripts (`scripts/tsconfig.json`) jamais vérifiés ; 2 erreurs dans `scripts/test-seed.ts` ; ajouter ce contrôle à la CI.
4. PR Dependabot de versions majeures, avec essai réel : #227 ioredis 6, puis #400 pillow 13 et #303 torch 2.13 (serveur des voix : à tester sur le serveur avant fusion, jamais pendant un rattrapage). Pour un outil de contrôle, lancer ce contrôle-là en local (ex. `pnpm a11y` après les builds) : `ship.sh` ne lance ni builds, ni audit, ni parcours.
5. Après chaque fusion qui touche l'API, la console, `shared-types` ou l'ingestion : `bash /c/Users/HP/bgs-ops/deploy.sh` (autorisé sans demander).

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Point 50 : installer la version de développement sur l'iPhone (lien dans le point).
- Point 66 : valider la phrase d'information de « Signaler cette réponse » (proposée dans le point).
- Point 67 : garder ou retirer la note « interface en wolof traduite automatiquement ».
- Point 68 : supprimer le 5ᵉ article refusé (reprise du Financial Times, 2019) ?
- Point 69 : disque — Téléchargements (9,4 Go) et SDK Android (4 Go).

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. La clé Anthropic est dans `apps/api/.env.local`, saisie par l'utilisateur seul.
- Garde du shell : pas d'accent grave dans `node -e` ni dans PowerShell hors guillemets ; une commande qui nomme `.env.local` est refusée (l'écrire dans un script) ; `git push` seulement après gitleaks (`ship.sh` le fait) ; écrire les scripts avec l'outil d'écriture de fichiers.
- La session démarre dans la copie servie : jamais d'écriture dedans ; avant la première modification, aller dans `-w2`/`-w4` sur une nouvelle branche (ERREURS.md, 25/10). Une copie de travail par livraison ; ne jamais changer de branche dans une copie en cours de livraison ; jamais de `git stash` nu ni de `--force`.
- Deux livraisons en parallèle qui ajoutent toutes deux une ligne en fin de `backlog.md` entrent en conflit : n'écrire au backlog qu'après la fusion de l'autre, branche mise à jour.
- Une PR bloquée par l'audit de sécurité : corriger la dépendance sur main, puis `gh pr update-branch <n>` avant de relancer la fusion.
- `deploy.sh` arrête la boucle des voix avant l'enregistrement en cours (ERREURS.md, 22/10) ; après tout redémarrage, relire le journal de chaque langue.
- Jamais `services.sh` ni `deploy.sh` dans un tube (refusé par le garde du shell) : rediriger vers un fichier puis le lire.
- La console Next.js 16.4 réécrit `apps/admin/AGENTS.md` au démarrage : le dépôt en garde la version écrite (#411) ; si la copie servie redevient sale, comparer à `origin/main` avant tout `checkout`.
- Parcourir le disque (`du`) est très lent sur cette machine : viser des dossiers précis, en arrière-plan.

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · mode d'emploi de tous les scripts : `C:\Users\HP\bgs-ops\README.md`.
- Livrer : `bash /c/Users/HP/bgs-ops/ship.sh <copie> <branche> "<titre>" <fichier-description> ["message OTA"]` (contrôles de la CI, PR, fusion, OTA si message).
- Tâches ouvertes du backlog sans tout relire : `pnpm backlog:open`.
- Carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.

## Dernière vérification
25/10 : #413, #415, #416 et #417 fusionnées avec tous les contrôles verts (tests de mutation : fusion des langues, effacement des signalements à 90 jours, suppression du profil de test) ; déploiement local à 17 h 56 (API 200, signalement invalide 400, liste sans connexion 401, console 307, voix reprises) ; 4 textes supprimés vérifiés (API 404) ; disque : 19 Go libres.

<!-- fin de la reprise -->
