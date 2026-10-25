# Reprise — Bic Gouv SN

**Mis à jour** : 25/10/2026 14 h 15 · **Mode** : autonome prolongé (demande du 22/10 ; s'arrêter pour toute dépense imprévue, sécurité, données personnelles, contenu publié, action difficile à défaire) · **main** : #413. Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001 (Next.js 16.4.1), surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081 (iPhone, copie `-demo`).
- Traduction automatique (#399, #401) : la surveillance traduit chaque nouvel article en anglais et en wolof toutes les 30 min, les fiches des démarches toutes les 6 h ; résultats dans `bgs-ops/logs/watch.log` (lignes `translation`). Refusé deux fois = plus renvoyé ; le compteur repart de `CHECKS_CHANGED_AT` (`services/ingestion/src/translation/batch-translation.ts`) à chaque correction des contrôles.
- Voix (serveur Hetzner `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français fini ; anglais en cours (environ 1 200 restants le 25/10 à 14 h 10, serveur parfois injoignable quelques minutes, retenté seul, `bgs-ops/logs/voices-en.log` ; un « scp: Connection closed » isolé est retenté seul) ; wolof ensuite, à finir sur le futur serveur d'hébergement (décision du 22/10).
- Banc d'essai de l'assistant : chaque dimanche à 4 h (tâche Windows « BicGouvSN-BancEssai », `bgs-ops/bench.sh`) ; passage du 25/10 : 77 / 96, aucune réponse inventée ; #413 (AST-41) corrige la semaine donnée à toutes les questions, le mélange des langues et les réponses coupées (contrôle des faiblesses : 28 / 39 contre 25). Contrôle rapide d'une correction avant fusion : `bash /c/Users/HP/bgs-ops/check-bench.sh <copie>` (≈ 0,17 $, remet seul les résultats du jour).
- Dernière mise à jour à distance de l'app : « Boutons mieux nommés pour la lecture d'écran et la commande vocale » (#282) ; tanstack (#280) partira avec la suivante. Metro (`-demo`) remis sur main le 24/10.
- Modèle de méthode générique pour tout nouveau projet : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` (24/10) ; y reporter chaque nouvelle règle de `~/.claude/ERREURS-GLOBALES.md`.

## En cours
Rien en cours d'écriture ; aucune branche ouverte hors Dependabot.

## Prochaines étapes (dans l'ordre)
1. AST-42 (backlog) : fiches de démarches mal trouvées pour les questions reformulées, refus trop littéraux (« Conseil de mercredi », visa Canada), titre d'article traité comme hors sujet. Extraits et réponses dans `.data/assistant/bench/2026-10-25.json` (`evidence`). Vérifier sur le vrai modèle avec `check-bench.sh` avant la fusion ; pièges toujours à 15 / 15.
2. PR Dependabot de versions majeures, avec essai réel : #227 ioredis 6 (lancer aussi les contrôles qui utilisent Redis), puis #400 pillow 13 et #303 torch 2.13 (serveur des voix : à tester sur le serveur avant fusion, jamais pendant un rattrapage). Les mineures du 24/10 sont fusionnées (#405, #281, #282, #280, #329 ; #397 fermée en doublon). Pour un outil de contrôle, lancer ce contrôle-là en local (ex. `pnpm a11y` après les builds) : `ship.sh` ne lance ni builds, ni audit, ni parcours.
3. Selon les réponses de l'utilisateur : DATA-10 (point 60), puis AST-30e, bouton « Signaler cette réponse » (point 66).
4. Après chaque fusion qui touche l'API, la console, `shared-types` ou l'ingestion : `bash /c/Users/HP/bgs-ops/deploy.sh` (autorisé sans demander).

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Point 60 : écarter 3 textes de démonstration WordPress (Industrie-Commerce) et un « Happy Easter » (Tourisme) ?
- Point 66 : durée de conservation (90 jours ?) et phrase de confidentialité pour « Signaler cette réponse ».
- Points 50, 52 à 55 (iPhone, mention de traduction, compteurs, disque, TestFlight).
- Branche distante fermée `feat/favorites-and-share` à supprimer sur GitHub (refusé à Claude par le contrôle de sécurité).

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. La clé Anthropic est dans `apps/api/.env.local`, saisie par l'utilisateur seul.
- Garde du shell : pas d'accent grave dans `node -e` ni dans PowerShell hors guillemets ; `git push` seulement après gitleaks (`ship.sh` le fait) ; écrire les scripts avec l'outil d'écriture de fichiers.
- La session démarre dans la copie servie : jamais d'écriture dedans ; avant la première modification, aller dans `-w2`/`-w4` sur une nouvelle branche (ERREURS.md, 25/10). Une copie de travail par livraison (`-w2`, `-w4`) ; ne jamais changer de branche dans une copie en cours de livraison ; jamais de `git stash` nu ni de `--force`.
- Une PR bloquée par l'audit de sécurité : corriger la dépendance sur main, puis `gh pr update-branch <n>` avant de relancer la fusion (relancer seul le contrôle ne suffit pas).
- `deploy.sh` arrête la boucle des voix avant l'enregistrement en cours (ERREURS.md, 22/10) ; après tout redémarrage, relire le journal de chaque langue.
- Jamais `services.sh` ni `deploy.sh` dans un tube (refusé par le garde du shell) : rediriger vers un fichier puis le lire.
- Une PR Dependabot : `ship.sh` attend la réécriture de Dependabot et part de sa version ; si la CI échoue de la même façon à chaque relance, lire le journal du job (ou rejouer le contrôle en local) au lieu de relancer.
- La console Next.js 16.4 réécrit `apps/admin/AGENTS.md` au démarrage : le dépôt en garde la version écrite (#411) ; si la copie servie redevient sale, comparer à `origin/main` avant tout `checkout`.
- Deux communiqués de mai et juin 2024 restent en français volontairement (decisions.md, 22/10).

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · mode d'emploi de tous les scripts : `C:\Users\HP\bgs-ops\README.md`.
- Livrer : `bash /c/Users/HP/bgs-ops/ship.sh <copie> <branche> "<titre>" <fichier-description> ["message OTA"]` (contrôles de la CI, PR, fusion, OTA si message).
- Tâches ouvertes du backlog sans tout relire : `pnpm backlog:open`.
- Carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.

## Dernière vérification
25/10 : #413 fusionnée avec tous les contrôles verts (112 tests de l'assistant, test de fusion des langues vérifié par mutation) ; déploiement local à 14 h 07 (API `/v1/health` 200, console 307, voix reprises) ; copie servie propre sur main ; résultats du banc du 25/10 remis tels que produits par le passage complet.

<!-- fin de la reprise -->
