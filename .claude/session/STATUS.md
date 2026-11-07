# Reprise — Bic Gouv SN

**Mis à jour** : 06/11/2026 · **Mode** : standard (le mode autonome a pris fin le 03/11 à 20 h) · **main** : NAV-01 bis (branche `fix/notification-cold-start`, livrée le 06/11 au soir avec mise à jour à distance). Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001, surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081, boucle des voix. Déploiement du 03/11 à 14 h 14. Journaux `api.log` et `watch.log` désormais complétés à chaque redémarrage (20 000 lignes, ligne « ===== restarted … »), plus jamais écrasés. L'ordinateur se met en veille (rien ne tourne pendant ce temps).
- **NAV-01 (06/11, demande de l'utilisateur)** : un article ouvert en touchant une notification (app fermée) n'avait aucun retour. 1er correctif #453 (`unstable_settings`) reçu par l'iPhone mais **sans effet** (l'utilisateur : ni icône, ni geste de retour). 2e correctif (NAV-01 bis) : `useNotificationTaps` appelé dans `app/(tabs)/_layout.tsx`, l'article n'est ouvert qu'une fois l'accueil monté ; le filet `HomeButton` est une flèche de retour sans mot (chevron iPhone, flèche Android). Cause exacte non reproduite hors du téléphone (ERREURS.md, 06/11, 2e entrée). Lancements d'une mise à jour : `npx eas-cli@latest update:insights <groupe> --platform ios --days 1`.
- **Notifications : réglé le 03/11.** La cause était l'interrupteur de l'app, coupé sur l'iPhone de l'utilisateur (serveur et Apple remettaient bien : accusés « ok » à 15 h 49 et 15 h 50). Réactivé, réinscription vue à 16 h 17, essai remis par Apple (ERREURS.md). Leçon : PUSH-07 (rendre visible un abonnement que le téléphone ne confirme plus). Un seul abonné (son téléphone, fr, heures calmes 22 h–7 h UTC).
- Surveillance des sites : #442 puis #446 déployées : n'écrit plus que les nouveaux échecs, ceux qui disparaissent (seulement quand leur site a été relu) et un rappel par jour ; vérifié sur plusieurs passages réels.
- Audit : accessibilité 103/103 écrans ; erreurs avalées recensées (43 dans l'app et la console) : la console écrit maintenant la cause technique au journal de son serveur (#447) ; dans l'app, rien n'est visible tant que Sentry n'a pas de clé (point 11 de `A-FAIRE-UTILISATEUR.md`).
- Voix (serveur `voices@95.216.167.95`, clé `~/.ssh/bic_gouv_ai`) : français et anglais finis ; wolof en cours (environ 3 150 restants le 03/11). **Serveur à jour le 03/11 à 15 h 55** (point 71 accepté) : torch 2.13, certifi, filelock, setuptools ; sauvegarde `~/voices/*.bak-0311` ; essai wolof + français réussi ; boucle relancée.
- Alertes Dependabot : voix traitées (#443 ; transformers et protobuf acceptés, décision du 09/10) ; npm : fast-uri et ip-address forcés, glob/minimatch/deepmerge acceptés (#444, decisions.md du 03/11).
- Skills du projet : `verification`, `livraison` ; sous-agent `relecteur`. Banc de l'assistant chaque dimanche à 4 h (`bgs-ops/bench.sh`).
- Modèle universel : `C:\Users\HP\Desktop\CLAUDE-MODELE-PROJET.md` ; y reporter chaque règle de `~/.claude/ERREURS-GLOBALES.md` (skill `alimenter-modele`).

## En cours
- Rien d'autre d'entamé. Alertes acceptées (glob, minimatch, deepmerge, uuid, transformers, protobuf, decode-uri-component) encore ouvertes sur GitHub : les marquer « tolerable risk » avec renvoi à decisions.md si l'utilisateur le souhaite.

## Prochaines étapes (dans l'ordre)
1. Demander à l'utilisateur de confirmer sur son iPhone, après la mise à jour à distance de NAV-01 bis (fermer et rouvrir l'app deux fois), qu'un article ouvert en touchant une notification, app fermée, montre la flèche de retour en haut à gauche et revient à l'accueil par le geste du bord gauche. Si non : ajouter un journal visible (Sentry sans clé) ou tester sur un Android.
2. PUSH-07 (**accepté par l'utilisateur le 06/11** : oubli des abonnements muets depuis **90 jours**, retrait unique côté app) : garder la date de dernière réinscription de chaque abonnement (fichier et PostgreSQL), abonnés actifs sur 30 jours dans la console ; dans l'app, retirer l'abonnement quand les notifications sont coupées et que l'adresse donnée au serveur est perdue (une seule fois, pas un appel à Expo à chaque ouverture).
3. Suite de l'audit : finitions de l'interface (UI/UX, design) ; erreurs avalées de l'app (`grep -rn "catch {|.catch(() =>" apps/mobile/src`), à rendre visibles quand Sentry aura sa clé.

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Rien de neuf (point 71 fait le 03/11).
- Point 70 en pause : médias sur l'ordinateur jusqu'au choix d'un hébergement (aussi la fin des mises en veille).
- iPhone : version **TestFlight** (canal `preview`), à recompiler avant son expiration vers le 13/01/2027.

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. Le dossier Téléchargements n'est jamais touché. Un `grep` qui nomme `env` dans `scripts/test-stack.ts` est refusé par le garde du shell : utiliser Grep ou Read.
- Surveiller un journal : `tail -F` rate des lignes sous Windows ; relire le nombre de lignes en boucle (`grep -ac "" fichier` toutes les 20 s).
- Garde du shell : pas d'accent grave dans `node -e` ; `git push` seulement après `gitleaks git --redact … &&` ; pas de `sleep` long en avant-plan (utiliser Monitor).
- Jamais d'écriture dans la copie servie `C:\bic-gouv-sn` ; scripts jetables dans le dossier temporaire de la session. Relire `git diff --cached --name-only` avant chaque commit.
- ESLint de tout le dépôt manque de mémoire (« Zone Allocation failed ») si une copie contient `apps/admin/.next` : le supprimer avant `verify.sh` (06/11).
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
06/11 : NAV-01 bis, `verify.sh` vert dans `C:ic-gouv-sn-w2` (installation, lint, types, format, tests avec couverture) ; 83 tests de l'app (parcours + notifications) verts. Non vérifié : le comportement sur l'iPhone.

<!-- fin de la reprise -->
