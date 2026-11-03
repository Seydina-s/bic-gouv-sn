# Reprise — Bic Gouv SN

**Mis à jour** : 03/11/2026 13 h 40 · **Mode** : autonome jusqu'au 03/11 à 15 h (demande de l'utilisateur : finir ses tâches, puis audits, tests, failles, bugs silencieux, UI/UX, design ; toutes autorisations données) · **main** : #446 (+ PR `fix/console-api-failure-causes`). Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001, surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081, boucle des voix. Déploiement du 03/11 à 12 h 47. Journaux `api.log` et `watch.log` désormais complétés à chaque redémarrage (20 000 lignes, ligne « ===== restarted … »), plus jamais écrasés. L'ordinateur se met en veille (rien ne tourne pendant ce temps).
- **Notifications** (demande de l'utilisateur : elles n'arrivent plus sur son iPhone) : #440 fusionnée et déployée. Ligne de démarrage de l'API : « Automatic notifications are on » → ni pause, ni service d'envoi manquant. Un article est arrivé à 11 h 51 (« SECTEUR POSTAL… », numerique) : la ligne de son annonce a été effacée par le déploiement de 12 h 03 (ERREURS.md) ; l'utilisateur peut la voir dans la console (Notifications, envois automatiques). Sinon, la cause se lira au prochain article de jour dans `bgs-ops/logs/api.log` (« Article announced to the phones » avec recipients, ou un code `PUSH_*` au journal des erreurs de la console). Un seul abonné (son téléphone, fr, heures calmes 22 h–7 h UTC).
- Surveillance des sites : #442 puis #446 déployées : n'écrit plus que les nouveaux échecs, ceux qui disparaissent (seulement quand leur site a été relu) et un rappel par jour ; vérifié sur plusieurs passages réels.
- Audit : accessibilité 103/103 écrans ; erreurs avalées recensées (43 dans l'app et la console) : la console écrit maintenant la cause technique au journal de son serveur ; dans l'app, rien n'est visible tant que Sentry n'a pas de clé (point 11 de `A-FAIRE-UTILISATEUR.md`).
- Voix (serveur `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français et anglais finis ; wolof en cours (3 155 restants le 03/11). Le serveur tourne encore avec torch 2.12 et l'ancien certifi : l'installation de #303 (torch 2.13) et #443 (certifi, filelock, setuptools) a été **refusée à l'agent par l'outil de sécurité** (copie vers le serveur + `uv sync --frozen`) → point 71 de `A-FAIRE-UTILISATEUR.md`. Sauvegarde prévue avant copie : `~/voices/*.bak-0311`.
- Alertes Dependabot : voix traitées (#443 ; transformers et protobuf acceptés, décision du 09/10) ; npm : fast-uri et ip-address forcés, glob/minimatch/deepmerge acceptés (#444, decisions.md du 03/11).
- Skills du projet : `verification`, `livraison` ; sous-agent `relecteur`. Banc de l'assistant chaque dimanche à 4 h (`bgs-ops/bench.sh`).
- Modèle universel : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` ; y reporter chaque règle de `~/.claude/ERREURS-GLOBALES.md` (skill `alimenter-modele`).

## En cours
- Rien d'entamé. Alertes acceptées (glob, minimatch, deepmerge, uuid, transformers, protobuf, decode-uri-component) encore ouvertes sur GitHub : les marquer « tolerable risk » avec renvoi à decisions.md si l'utilisateur le souhaite.

## Prochaines étapes (dans l'ordre)
1. Au prochain article de jour : lire dans `bgs-ops/logs/api.log` la ligne « Article announced to the phones » (recipients 1) ou le code `PUSH_*` ; en déduire la cause, la corriger, la consigner dans ERREURS.md.
2. Si l'utilisateur accepte le point 71 : arrêter la boucle des voix (comme `deploy.sh`, lignes 16-18), vérifier qu'aucun `synthesize.py` ne tourne sur le serveur (ne pas utiliser `pkill -f` avec un motif présent dans sa propre commande SSH : la session se coupe), sauvegarder, copier `services/voices/pyproject.toml` et `uv.lock` de `origin/main` dans `~/voices`, `uv sync --frozen`, puis `services.sh`.
3. Suite de l'audit : finitions de l'interface (UI/UX, design) ; erreurs avalées de l'app (`grep -rn "catch {|.catch(() =>" apps/mobile/src`), à rendre visibles quand Sentry aura sa clé.

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Point 71 : autoriser ou non l'installation sur le serveur des voix.
- Point 70 en pause : médias sur l'ordinateur jusqu'au choix d'un hébergement (aussi la fin des mises en veille).
- iPhone : version **TestFlight** (canal `preview`), à recompiler avant son expiration vers le 13/01/2027.

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. Le dossier Téléchargements n'est jamais touché. Un `grep` qui nomme `env` dans `scripts/test-stack.ts` est refusé par le garde du shell : utiliser Grep ou Read.
- Garde du shell : pas d'accent grave dans `node -e` ; `git push` seulement après `gitleaks git --redact … &&` ; pas de `sleep` long en avant-plan (utiliser Monitor).
- Jamais d'écriture dans la copie servie `C:\bic-gouv-sn` ; scripts jetables dans le dossier temporaire de la session. Relire `git diff --cached --name-only` avant chaque commit.
- **Une seule suite complète à la fois** sur la machine, même un `vitest` ou un `tsc` d'appoint.
- Deux livraisons qui ajoutent une ligne en fin de `backlog.md` entrent en conflit : écrire au backlog après la fusion de l'autre.
- `pnpm a11y` lit l'export web de l'app (`apps/mobile/build/web`) : refaire `pnpm --filter @bgs/mobile export:web` avant, sinon il audite une ancienne version (03/11 : 14 faux défauts).
- L'API des tests de bout en bout tourne en `NODE_ENV=test` (`scripts/test-stack.ts`) : elle n'inscrit pas `PUSH_NOT_CONFIGURED`.
- `deploy.sh` arrête la boucle des voix ; jamais `services.sh` ni `deploy.sh` dans un tube. Si `curl localhost:3100/v1/health` donne un 307 vers `/fr/…`, c'est un autre projet de l'utilisateur sur le port : ne pas l'arrêter.

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · scripts : `C:\Users\HP\bgs-ops\README.md` · livrer : skill `livraison`.
- Tâches ouvertes : `pnpm backlog:open` · carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.
- Notification silencieuse de contrôle (aucun affichage) : envoyer `{"to": <jeton>, "_contentAvailable": true, "priority": "normal"}` à `https://exp.host/--/api/v2/push/send`, puis l'accusé par `…/getReceipts`.

## Dernière vérification
03/11 : #440 (e2e 11/11 en local, CI verte), #303, #442 (tests du journal des échecs, types, lint) et #443 fusionnées ; #444, #445, #446 fusionnées ; déploiements de 10 h 46, 11 h 29, 12 h 03 et 12 h 47 vérifiés (santé 200, console 307, voix relancées).

<!-- fin de la reprise -->
