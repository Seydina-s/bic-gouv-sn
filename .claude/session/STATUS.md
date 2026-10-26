# Reprise — Bic Gouv SN

**Mis à jour** : 26/10/2026 1 h 55 · **Mode** : autonome prolongé (demande du 22/10 ; s'arrêter pour toute dépense imprévue, sécurité, données personnelles, contenu publié, action difficile à défaire) · **main** : #425. Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001 (Next.js 16.4.1), surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081 (iPhone, copie `-demo`). `deploy.sh` relance aussi le filtre public depuis le 25/10.
- **Skills du projet** (`.claude/skills/`) : `verification` (avant de dire « terminé » : contrôles exacts de la CI par script, diff, tests affaiblis, rapport fixe) et `livraison` (procédure complète) ; sous-agent `relecteur` (`.claude/agents/`, lecture seule). Claude crée ses skills et hooks sans attendre (décision du 25/10, decisions.md).
- « Signaler cette réponse » (AST-30e) en service : serveur (#417, 90 jours, effacement automatique), page « Réponses signalées » de la console (#419), bouton de l'app avec la phrase validée (#420, mise à jour à distance publiée) ; route autorisée par le filtre public. Chaque dimanche, le banc d'essai repose les questions signalées (#423, AST-30g), sans les juger : leur nouvelle réponse est dans `.data/assistant/bench/flag-rechecks.json`, affichée sous le signalement dans la console ; jamais leur texte dans le journal ni dans les fichiers gardés sans limite.
- Traduction automatique (#399, #401) : nouveaux articles traduits en anglais et en wolof toutes les 30 min, fiches toutes les 6 h (`bgs-ops/logs/watch.log`). Plus aucune mention de traduction dans l'app (#416, #420).
- Voix (serveur Hetzner `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français fini ; anglais en cours (335 restants le 26/10 à 0 h 15, `bgs-ops/logs/voices-en.log`) ; wolof ensuite, à finir sur le futur serveur d'hébergement.
- Banc d'essai de l'assistant : chaque dimanche à 4 h (`bgs-ops/bench.sh`) ; passage du 25/10 : 77 / 96, aucune réponse inventée ; après AST-42 (#425), contrôle rapide 37 / 39 (contre 28), pièges 15 / 15 ; restent le visa pour le Canada et la carte grise (suivis comme faiblesses). Contrôle rapide d'une correction : `bash /c/Users/HP/bgs-ops/check-bench.sh <copie>` (≈ 0,17 $).
- Contenus refusés par les règles de collecte : `pnpm --filter @bgs/ingestion discard` (liste) / `--apply <id>` (copie privée dans `.data/discarded-articles.json`) ; 5 supprimés le 25/10, aucun restant.
- Disque : 23 Go libres (SDK Android supprimé) ; le gros poste est `.data/media` (15 Go, en hausse) → point 70.
- Modèle universel de prompt système : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` (v3.1 du 25/10 : ossature du document initial, 30 suppositions, section 18 « Utiliser Claude Code au maximum » tirée des 5 cours Claude Code de l'Anthropic Academy) ; y reporter chaque nouvelle règle de `~/.claude/ERREURS-GLOBALES.md`.

## En cours
Rien en cours d'écriture.

## Prochaines étapes (dans l'ordre)
1. QA-14 : types des scripts (`scripts/tsconfig.json`) jamais vérifiés ; 2 erreurs dans `scripts/test-seed.ts` ; ajouter le contrôle à la CI.
2. PR Dependabot majeures avec essai réel : #227 ioredis 6, puis #400 pillow 13 et #303 torch 2.13 (serveur des voix : tester sur le serveur avant fusion).
3. Après chaque livraison : skills `verification` puis `livraison` (déploiement et reprise compris).

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Rien d'urgent. Point 70 en pause : médias gardés sur l'ordinateur jusqu'au choix d'un hébergement par l'utilisateur.
- iPhone : l'utilisateur garde la version **TestFlight** (15/10, canal `preview`, à jour par mise à jour à distance) ; à recompiler (profil `testflight`) avant son expiration vers le 13/01/2027. Ne plus lui proposer la version de développement.

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. Le dossier Téléchargements de l'utilisateur n'est jamais touché.
- Garde du shell : pas d'accent grave dans `node -e` ni dans PowerShell hors guillemets ; une commande qui nomme `.env.local` est refusée (l'écrire dans un script) ; antislashs dans un script : l'écrire avec l'outil d'écriture (`String.raw`), jamais dans la commande.
- La session démarre dans la copie servie : jamais d'écriture dedans ; travailler dans `-w2`/`-w4` sur une nouvelle branche. Jamais de changement de branche dans une copie en cours de livraison ; jamais de `git stash` nu ni de `--force`.
- Avant de livrer : la vérification complète, **sans filtre** (ERREURS.md, 25/10 : deux arrêts de `ship.sh` sur un même jour).
- Deux livraisons en parallèle qui ajoutent une ligne en fin de `backlog.md` entrent en conflit : écrire au backlog après la fusion de l'autre.
- `deploy.sh` arrête la boucle des voix (ERREURS.md, 22/10) : après tout redémarrage, relire le journal de chaque langue. Jamais `services.sh` ni `deploy.sh` exécutés dans un tube.
- La console Next.js 16.4 réécrit `apps/admin/AGENTS.md` au démarrage (#411) : comparer à `origin/main` avant tout `checkout` si la copie servie est sale.
- Parcourir le disque (`du`) est très lent sur cette machine : viser des dossiers précis, en arrière-plan.

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · scripts : `C:\Users\HP\bgs-ops\README.md` · livrer : skill `livraison`.
- Tâches ouvertes du backlog sans tout relire : `pnpm backlog:open`.
- Carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.

## Dernière vérification
26/10 (1 h 50) : #425 fusionnée, CI verte, mutations détectées (jour de semaine, « militaire »), mesure de la recherche 0,78 → 0,83, contrôle rapide du banc 37 / 39 ; déploiement à 1 h 49 (API 200, console 307, voix relancées).
26/10 : #423 fusionnée, contrôles de la CI verts deux fois, mutations détectées (réponse reposée d'un signalement effacé, « réponse différente »), audit 103/103 ; déploiement à 0 h 15 (API 200, console 307, voix relancées).
25/10 : #413 et #415 à #420 fusionnées avec tous les contrôles verts (tests de mutation : fusion des langues, effacement des signalements, profil de test, phrase d'information du bouton, règle du garde du shell) ; audit d'accessibilité 103/103 ; déploiement à 18 h 45 (API 200, console 307) ; filtre public relancé à 19 h 27 (signalement via le filtre : 400 de l'API, route inconnue : 404).

<!-- fin de la reprise -->
