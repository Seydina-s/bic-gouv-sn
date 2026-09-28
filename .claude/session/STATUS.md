# STATUS — Bic Gouv SN

**Dernière mise à jour** : 28/09/2026 (18 h 45) · **Mode** : autonome jusqu'à 20 h (demande de l'utilisateur), puis retour au mode standard. Actions de l'utilisateur reportées : `.claude/session/A-FAIRE-UTILISATEUR.md` (12 points, dont 1 réglé).

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts, dont un **audit d'accessibilité** (50 écrans, clair et sombre, langue déclarée vérifiée).
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
- Contrôle complet : 983 tests verts.

## En attente de l'utilisateur
Voir `.claude/session/A-FAIRE-UTILISATEUR.md`. Nouveau aujourd'hui : point 12 (présentation « étape par étape » des démarches : la source est en questions-réponses) ; proposition ADM-10 (écran « Comptes » dans la console : touche à la sécurité, à valider).

## Prochaine tâche
- Brancher l'envoi réel des notifications dès la version de test (A-03, FEED-04) : un fournisseur derrière l'interface `PushProvider`.
- QA-07, suite : la carte dans l'audit (tuiles).
- Dès la version de test installée : QA-02, QA-03, QA-04, LIC-02.

## Services locaux (au 28/09, 18 h)
- API sur 3100 reconstruite sur `main` (notifications, journal d'audit, performances) ; console en développement sur 3001 ; Expo sur 8081 ; une seule collecte temps réel (verrou actif, contrôle des retraits chaque nuit).
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
