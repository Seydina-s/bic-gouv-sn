# STATUS — Bic Gouv SN

**Dernière mise à jour** : 26/09/2026 (nuit) · **Mode** : autonome

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts. Secret `SENTRY_AUTH_TOKEN` en place (utilisateur, 25/09).
- Incident du 25/09 (fichier des articles remis à zéro) corrigé : écriture durable + copie `.bak`. Reconstruction faite : 953 articles (316 FR+WO, 94 Conseils des ministres), 713 couvertures ; images du texte en cours (script `scratchpad/rebuild.sh`, journaux `scratchpad/rebuild-logs/`, reprenable).
- Design D-05 (« La Une » + pagne tissé + verre) documenté dans DESIGN.md ; constantes passées en jetons ; utilisateur « un peu satisfait », améliorations futures prévues.
- Paquet de l'app allégé (Android 4,96 Mo, iOS 4,68 Mo). 462 tests, contrôle complet vert.

## En attente de l'utilisateur
1. W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; S1-02 budget d'hébergement.

## Prochaine tâche
Fin de l'import des images du texte, puis PERF-03 (Sentry), DATA-01 (sauvegardes), VID-01, WO-01, RESP-01. UPG-01 attend la version stable d'Expo SDK 58.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel). Sauvegarde de l'ancien historique : `C:\Users\HP\tools\backup-bic-gouv-sn.git`.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : dans `apps/api`, après `pnpm build` : `PORT=3100 NEWS_STORE_PATH=C:/bic-gouv-sn/.data/news.json MEDIA_ROOT=C:/bic-gouv-sn/.data/media pnpm start` (le DSN Sentry est lu dans `.env.local`).
- Vérification visuelle : export web (`expo export --clear`, API via relais du serveur local port 8084) + Chrome headless (émulation mobile).
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur, jamais via le shell.
