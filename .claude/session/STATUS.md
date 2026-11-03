# Reprise — Bic Gouv SN

**Mis à jour** : 03/11/2026 9 h 15 · **Mode** : autonome jusqu'au 03/11 à 15 h (demande de l'utilisateur : finir ses tâches, puis audits, tests, failles, bugs silencieux, UI/UX, design ; toutes autorisations données) · **main** : #438. Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001, surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081, boucle des voix (relancée le 03/11 à 2 h 45). L'ordinateur se met en veille (01/11 20 h 42 → 03/11 1 h 53 : ni collecte, ni notifications, ni voix pendant ce temps).
- **Notifications** (demande de l'utilisateur : elles n'arrivent plus sur son iPhone) : un seul abonné (son téléphone, fr, heures calmes 22 h–7 h UTC, inscrit le 23/10) ; son adresse Expo est valable (notification silencieuse de contrôle, accusé d'Apple « ok ») ; 26 articles de la semaine devaient partir de jour ; le vrai notificateur rejoué sur les vrais articles les annonce. La cause réelle reste inconnue : aucune trace d'envoi nulle part (registre des envois et pause dans `.data/admin`, jamais lus). PR **#440** (`fix/push-observability`, copie `-w2`) rend tout visible (état au démarrage, chaque annonce, refus d'Expo, accusés d'Apple et de Google, codes `PUSH_*` au journal des erreurs).
- Voix (serveur `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français et anglais finis ; wolof en cours (≈ 34 par jour, 3 380 restants le 26/10). Serveur passé sur **pillow 13** le 03/11 (wolof identique à l'octet près). Copies d'essai : `~/voices-trial`, `~/voices-torch` (torch 2.13 installé, essai des 3 voix réussi) ; scripts `~/trial*.sh`.
- Audit des dépendances : node-forge forcé en 1.4.1, exception justifiée decode-uri-component (#438, decisions.md). GitHub signale encore 36 alertes Dependabot sur main (1 critique, 8 élevées), à trier.
- Skills du projet : `verification`, `livraison` ; sous-agent `relecteur`. Banc de l'assistant chaque dimanche à 4 h (`bgs-ops/bench.sh`).
- Modèle universel : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` ; y reporter chaque règle de `~/.claude/ERREURS-GLOBALES.md` (skill `alimenter-modele`).

## En cours
- **#440** ouverte, non fusionnée : le parcours de bout en bout « Console : marquer une erreur comme réglée » échoue en CI (« Production builds ») car l'API de test démarre sans service d'envoi et inscrit `PUSH_NOT_CONFIGURED` au journal des erreurs. À corriger : n'inscrire cette erreur que si l'envoi est attendu (production), ou lancer l'API de test (`scripts/test-stack.ts`) avec un réglage qui l'exclut ; rejouer `pnpm e2e` en local.
- **#303** torch 2.13 ouverte (décision et backlog déjà dans la branche) : `gh pr update-branch 303` (l'audit bloquait), puis livrer ; ensuite, boucle des voix arrêtée : `uv sync --frozen` dans `~/voices` sur le serveur, puis `deploy.sh`.
- Branche **`wip/watch-failure-log`** (envoyée, sans PR) : `services/ingestion/src/lib/failure-log.ts` + tests (4 verts), pas encore branché dans `cli/watch.ts` (ligne « ✗ code ref » écrite à chaque passage : ≈ 4 000 lignes par semaine pour les mêmes 30 quarantaines, dont des articles de démonstration WordPress de `femme.gouv.sn`).

## Prochaines étapes (dans l'ordre)
1. Corriger #440 (voir « En cours »), livrer, `deploy.sh`, puis lire dans `bgs-ops/logs/api.log` la ligne de démarrage « Automatic notifications are on / paused / cannot be sent » : elle donne la cause. Si « paused » : demander à l'utilisateur de reprendre l'envoi dans la console (Notifications). Contrôler au prochain article de jour la ligne « Article announced to the phones » (recipients 1), puis consigner la cause dans ERREURS.md.
2. #303 torch 2.13 (voir « En cours »).
3. Brancher `FailureLog` dans `cli/watch.ts` (ligne 338), livrer, relancer la surveillance.
4. Trier les alertes Dependabot de GitHub (1 critique) ; puis l'audit demandé : interface (accessibilité `pnpm a11y`, finitions), bugs silencieux (erreurs avalées, recensement fait : surtout l'app et la console).

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Peut-être reprendre l'envoi automatique dans la console, selon la ligne de démarrage de l'API (étape 1).
- Point 70 en pause : médias sur l'ordinateur jusqu'au choix d'un hébergement (aussi la fin des mises en veille).
- iPhone : version **TestFlight** (canal `preview`), à recompiler avant son expiration vers le 13/01/2027.

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. Le dossier Téléchargements n'est jamais touché. Un `grep` qui nomme `env` dans `scripts/test-stack.ts` est refusé par le garde du shell : utiliser Grep ou Read.
- Garde du shell : pas d'accent grave dans `node -e` ; `git push` seulement après `gitleaks git --redact … &&`.
- Jamais d'écriture dans la copie servie `C:\bic-gouv-sn` ; scripts jetables dans le dossier temporaire de la session, jamais dans une copie du dépôt (03/11 : deux fichiers emportés par `git add -A`). Relire `git diff --cached --name-only` avant chaque commit.
- **Une seule suite complète à la fois** sur la machine, même un `vitest` ou un `tsc` d'appoint (03/11 : vérification des types de `ship.sh` tombée pendant des tests lancés dans l'autre copie).
- Deux livraisons qui ajoutent une ligne en fin de `backlog.md` entrent en conflit : écrire au backlog après la fusion de l'autre.
- `deploy.sh` arrête la boucle des voix ; jamais `services.sh` ni `deploy.sh` dans un tube. Si `curl localhost:3100/v1/health` donne un 307 vers `/fr/…`, c'est un autre projet de l'utilisateur sur le port : ne pas l'arrêter.

## Repères
- Démarrer : `bash /c/Users/HP/bgs-ops/services.sh` · scripts : `C:\Users\HP\bgs-ops\README.md` · livrer : skill `livraison`.
- Tâches ouvertes : `pnpm backlog:open` · carte du code : `node ~/.claude/skills/session-rotation/scripts/map.mjs . --focus <dossier>`.
- Notification silencieuse de contrôle (aucun affichage) : envoyer `{"to": <jeton>, "_contentAvailable": true, "priority": "normal"}` à `https://exp.host/--/api/v2/push/send`, puis l'accusé par `…/getReceipts`.

## Dernière vérification
03/11 : #438 fusionnée (audit sans faille grave, cache de vitest par paquet : contrôles complets verts) ; #440 : contrôles locaux verts (tests 479 + 1 sauté pour l'API), mutations détectées (branchement dans l'API, signalement des refus), e2e en CI rouge (voir « En cours ») ; essai des 3 voix sur le serveur avec torch 2.13 et pillow 13 : wolof identique à l'octet près.
26/10 (14 h 20) : #430, #227 ioredis 6, #400 pillow 13 et #431 fusionnées ; déploiement à 13 h 48.

<!-- fin de la reprise -->
