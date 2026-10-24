# Reprise — Bic Gouv SN

**Mis à jour** : 24/10/2026 22 h 40 · **Mode** : autonome prolongé (demande du 22/10 ; s'arrêter pour toute dépense imprévue, sécurité, données personnelles, contenu publié, action difficile à défaire) · **main** : #409 (+ garde-fou des tubes). Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001 (Next.js 16.4.1), surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081 (iPhone, copie `-demo`).
- Traduction automatique (#399, #401) : la surveillance traduit chaque nouvel article en anglais et en wolof toutes les 30 min, les fiches des démarches toutes les 6 h ; résultats dans `bgs-ops/logs/watch.log` (lignes `translation`). Refusé deux fois = plus renvoyé ; le compteur repart de `CHECKS_CHANGED_AT` (`services/ingestion/src/translation/batch-translation.ts`) à chaque correction des contrôles.
- Voix (serveur Hetzner `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français fini ; anglais en cours (2 001 restants le 24/10 à 22 h 10, `bgs-ops/logs/voices-en.log` ; un « scp: Connection closed » isolé est retenté seul) ; wolof ensuite, à finir sur le futur serveur d'hébergement (décision du 22/10).
- Banc d'essai de l'assistant : chaque dimanche à 4 h (tâche Windows « BicGouvSN-BancEssai », `bgs-ops/bench.sh`) ; dernier score 86 / 92 ; les échecs gardent désormais extraits et réponse brute (`evidence`, #401).
- Dernière mise à jour à distance de l'app : « Boutons mieux nommés pour la lecture d'écran et la commande vocale » (#282) ; tanstack (#280) partira avec la suivante. Metro (`-demo`) remis sur main le 24/10.
- Modèle de méthode générique pour tout nouveau projet : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` (24/10) ; y reporter chaque nouvelle règle de `~/.claude/ERREURS-GLOBALES.md`.

## En cours
Rien en cours d'écriture ; aucune branche ouverte hors Dependabot.

## Prochaines étapes (dans l'ordre)
1. Dimanche 25/10 après 4 h : lire le passage du banc (`.data/assistant/bench/2026-10-25.json`, champ `evidence` des échecs) et corriger les faiblesses récurrentes.
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
- Une copie de travail par livraison (`-w2`, `-w4`) ; ne jamais changer de branche dans une copie en cours de livraison ; jamais de `git stash` nu ni de `--force`.
- Une PR bloquée par l'audit de sécurité : corriger la dépendance sur main, puis `gh pr update-branch <n>` avant de relancer la fusion (relancer seul le contrôle ne suffit pas).
- `deploy.sh` arrête la boucle des voix avant l'enregistrement en cours (ERREURS.md, 22/10) ; après tout redémarrage, relire le journal de chaque langue.
- Deux communiqués de mai et juin 2024 restent en français volontairement (decisions.md, 22/10).

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · mode d'emploi de tous les scripts : `C:\Users\HP\bgs-ops\README.md`.
- Livrer : `bash /c/Users/HP/bgs-ops/ship.sh <copie> <branche> "<titre>" <fichier-description> ["message OTA"]` (contrôles de la CI, PR, fusion, OTA si message).
- Tâches ouvertes du backlog sans tout relire : `pnpm backlog:open`.
- Carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.

## Dernière vérification
23/10 : #399, #401, #403 et #404 fusionnées avec tous les contrôles verts (API 458 tests, ingestion 369, app 305 + 11 e2e, console 131) ; déploiement local vérifié (API 200, console 307, voix et traduction actives) ; aucune copie de travail sur une branche, aucun stash.

<!-- fin de la reprise -->
