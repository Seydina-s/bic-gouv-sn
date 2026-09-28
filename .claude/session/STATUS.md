# STATUS — Bic Gouv SN

**Dernière mise à jour** : 28/09/2026 (9 h 30) · **Mode** : autonome jusqu'à 11 h (demande de l'utilisateur du 27/09), puis retour au mode standard. Actions de l'utilisateur reportées : `.claude/session/A-FAIRE-UTILISATEUR.md` (11 points).

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts, dont désormais un **audit d'accessibilité** (42 écrans, clair et sombre).
- Articles : 969 (FR + WO), **36 avec leurs PDF officiels** conservés chez nous (dont les communiqués du Conseil des ministres). Démarches : 718 fiches, 18 thèmes. Services : 880 proposés, vérification humaine dans la console.
- Nuit du 27 au 28/09 (PR #79 à #91) : garde-fou shell ; CSP à nonce de la console ; économie de données ; mentions des logiciels libres ; journal des erreurs en langage simple ; réponses compressées ; contrôle à distance (coupures, version minimale) ; corrections d'accessibilité ; quartier gardé hors ligne sur la carte ; PDF officiels (texte et pièces jointes) ; audit d'accessibilité automatique étendu aux fiches.
- Contrôle complet : 917 tests verts.

## En attente de l'utilisateur
Voir `.claude/session/A-FAIRE-UTILISATEUR.md`. Nouveaux cette nuit : choix d'affichage d'un article retiré par la source (ING-03) ; jeton Sentry en secret (MON-01, ADM-04).

## Prochaine tâche
- ING-03 (détection des articles retirés) dès le choix d'affichage de l'utilisateur.
- QA-07, suite : photos (fondu d'expo-image sur le web) et carte dans l'audit.
- Dès la version de test installée : QA-02, QA-03, QA-04, LIC-02.

## Services locaux (au 28/09, 9 h 30)
- API sur 3100 reconstruite sur `main` à jour des PDF (sert `/media/documents/…`) ; console en développement sur 3001 ; Expo sur 8081 (`--go --offline`, relancé après l'ajout d'axe-core) ; collecte temps réel relancée avec le traitement des pièces jointes.

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
