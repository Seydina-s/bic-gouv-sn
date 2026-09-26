# STATUS — Bic Gouv SN

**Dernière mise à jour** : 26/09/2026 (soir) · **Mode** : autonome

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts. Secret `SENTRY_AUTH_TOKEN` en place (utilisateur, 25/09).
- Incident du 25/09 (fichier des articles remis à zéro) corrigé : écriture durable + copie `.bak`. Reconstruction faite : 953 articles (316 FR+WO, 94 Conseils des ministres), 713 couvertures ; images du texte en cours (script `scratchpad/rebuild.sh`, journaux `scratchpad/rebuild-logs/`, reprenable).
- Design D-05 (« La Une » + pagne tissé + verre) documenté dans DESIGN.md ; constantes passées en jetons ; utilisateur « un peu satisfait », améliorations futures prévues.
- Démarches (e-senegal.sn) : 718 fiches collectées, API /v1/procedures, onglet « Démarches » de l'app (recherche, fiche, lien officiel) : DEM-01 à DEM-03 faits.
- Données : copies quotidiennes par le veilleur (7 gardées), supervision de la collecte dans l'admin.
- Paquet de l'app allégé (Android 4,96 Mo, iOS 4,68 Mo). 462 tests, contrôle complet vert.

## En attente de l'utilisateur
1. W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; S1-02 budget d'hébergement.

## Prochaine tâche
DEM-04 (lier démarches et carte), PERF-03 (poids de Sentry), PERF-04 (sous-ensemble des polices). ADM-02 (connexion admin) : options à présenter à l'utilisateur (décision de sécurité). SPLASH-01 attend le logo ; UX-01 attend les retours design. UPG-01 attend la version stable d'Expo SDK 58.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel). Sauvegarde de l'ancien historique : `C:\Users\HP\tools\backup-bic-gouv-sn.git`.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : dans `apps/api`, après `pnpm build` : `PORT=3100 NEWS_STORE_PATH=C:/bic-gouv-sn/.data/news.json PROCEDURES_STORE_PATH=C:/bic-gouv-sn/.data/procedures.json MEDIA_ROOT=C:/bic-gouv-sn/.data/media INGESTION_STATUS_PATH=C:/bic-gouv-sn/.data/ingestion-status.json pnpm start` (le DSN Sentry est lu dans `.env.local`).
- Vérification visuelle : export web (`expo export --clear`, API via relais du serveur local port 8084) + Chrome headless (émulation mobile).
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur, jamais via le shell.
