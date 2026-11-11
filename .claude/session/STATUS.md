# Reprise — Bic Gouv SN

**Mis à jour** : 11/11/2026 · **Mode** : standard (le mode autonome a pris fin le 03/11 à 20 h) · **main** : PUSH-07 (#456, déployé le 07/11 à 7 h 11, contrôlé le 11/11). Historique des sessions : `HISTORIQUE.md` (à ne lire que pour un besoin précis). Méthode : skill `session-rotation`.

## État
- Services locaux en marche (`bash /c/Users/HP/bgs-ops/services.sh` relance ce qui est tombé) : API 3100, console 3001, surveillance des 22 sites + der.sn, filtre public 3200 + tunnel ngrok, Metro 8081, boucle des voix. Déploiement du 03/11 à 14 h 14. Journaux `api.log` et `watch.log` désormais complétés à chaque redémarrage (20 000 lignes, ligne « ===== restarted … »), plus jamais écrasés. L'ordinateur se met en veille (rien ne tourne pendant ce temps).
- **NAV-01 terminé** : l'utilisateur a confirmé sur l'iPhone le 07/11 (« ça marche à merveille ») : article ouvert depuis une notification, app fermée, avec flèche de retour et geste du bord gauche (#455). Lancements d'une mise à jour : `npx eas-cli@latest update:insights <groupe> --platform ios --days 1`.
- **11/11 : clé Anthropic de l'API renouvelée par l'utilisateur** dans `apps/api/.env.local` (l'ancienne donnait 401 : assistant « unavailable », et le projet du film, qui passe par l'API, échouait). API redémarrée à 17 h 55 : vraie question « dernier Conseil des ministres » → `answered`, plus de 401 dans `api.log`. Redémarrer l'API seule : `taskkill` du processus qui écoute sur 3100 (`netstat -ano | grep ":3100 .*LISTENING"`), puis `services.sh`.
- **11/11 : notifications** : l'iPhone était désinscrit depuis le 07/11 à 0 h 12 (séquelle de l'ancien défaut, ERREURS.md « Suite (11/11) ») ; réinscrit le 11/11 à 13 h UTC après ouverture de l'app (1 abonné, `seenAt` frais). Surveiller qu'aucun `DELETE /v1/push/subscription` ne réapparaît dans `api.log`.
- **Film de présentation (motion design)** : projet à part, hors dépôt, `C:\Users\HP\bgs-video` (son propre CLAUDE.md, START.md, SUIVI.md, références analysées). Il se mène dans sa propre session, pas ici. Skill `regarder-video` créée le 11/11 (yt-dlp + ffmpeg via `pip --user`, `python -m yt_dlp`).
- **PUSH-07 (07/11, livré)** : date du dernier signe de vie de chaque abonnement (`seenAt` dans le fichier, colonne `seen_at`, migration 016), oubli des téléphones muets depuis 90 jours avant chaque envoi (`forgetSilent` dans `expo-push-provider.ts`), total « actifs sur 30 jours » dans la console (`activeLastMonth`), retrait unique de l'abonnement par l'app quand le téléphone refuse les notifications. Défaut trouvé en chemin et corrigé : l'app retirait puis recréait son abonnement à chaque ouverture (ERREURS.md, 07/11). Backlog, decisions.md, ERREURS.md et `~/.claude/ERREURS-GLOBALES.md` déjà à jour.
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
1. Vérifier dans `api.log` qu'aucun `DELETE /v1/push/subscription` n'a suivi la réinscription du 11/11 (sinon : défaut de PUSH-07 encore présent, à rouvrir).
2. Suite de l'audit (proposer un plan à l'utilisateur avant de commencer) : finitions de l'interface (UI/UX, design) ; erreurs avalées de l'app (`grep -rn "catch {|.catch(() =>" apps/mobile/src`), à rendre visibles quand Sentry aura sa clé.

## Attend l'utilisateur (`.claude/session/A-FAIRE-UTILISATEUR.md`)
- Rien de neuf (point 71 fait le 03/11).
- Point 70 en pause : médias sur l'ordinateur jusqu'au choix d'un hébergement (aussi la fin des mises en veille).
- iPhone : version **TestFlight** (canal `preview`), à recompiler avant son expiration vers le 13/01/2027.

## Points d'attention
- Tout texte visible par l'utilisateur en français ; commits et PR sans aucune mention de Claude (CLAUDE.md §15).
- Ne jamais lire `.env*` (sauf `.env.example`), `.data/admin/**`, clés, `*.p8`. Pour tester une clé : passer par l'API (route qui l'utilise + journal), jamais par un script qui ouvre le fichier ; ne jamais écrire le nom d'un fichier de secrets de façon détournée pour passer le garde (refusé le 11/11, à juste titre). Le dossier Téléchargements n'est jamais touché. Un `grep` qui nomme `env` dans `scripts/test-stack.ts` est refusé par le garde du shell : utiliser Grep ou Read.
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
11/11 : API saine (200), assistant `answered` avec la nouvelle clé, 1 abonné aux notifications (`seenAt` du jour), tunnel public 200. 07/11 : PUSH-07, `verify.sh` complet vert (installation, lint, types, format, tests avec couverture) ; tests des notifications de l'API verts (48, fichier et PostgreSQL), tests de l'app `NotificationsProvider` + `data` verts (le test « is renewed at each opening » échouait avant le correctif). NAV-01 confirmé sur l'iPhone par l'utilisateur.

<!-- fin de la reprise -->
