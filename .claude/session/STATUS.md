# STATUS — Bic Gouv SN

**Dernière mise à jour** : 25/09/2026 (soir) · **Mode** : autonome

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn (historique nettoyé, ancien dépôt archivé en privé `bic-gouv-sn-archive`). `main` protégée : tout passe par PR + 3 contrôles verts.
- Tranche verticale fusionnée dans `main` : collecte presidence.sn (961 articles, 717 photos), API /v1/news (filtre rubrique, ETag), app « La Une » + motifs du pagne tissé + barre en verre dépoli (D-05, choix utilisateur).
- Sentry : DSN en `.env.local` (API + mobile, non versionnés), message de test reçu ; plugin Expo prêt pour les source maps.
- 450 tests, contrôle complet vert.

## En attente de l'utilisateur
1. Mettre le jeton Sentry en secret GitHub : dépôt → Settings → Secrets and variables → Actions → New repository secret, nom `SENTRY_AUTH_TOKEN` (ne jamais le coller dans le chat).
2. Avis sur « La Une » vu sur iPhone (QA-04).
3. W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; S1-02 budget d'hébergement.

## Prochaine tâche
MED-02 (PDF et images du corps des articles stockés chez nous), puis UPG-01 (Expo SDK 58), PERF-03/04, WO-01, VID-01, RESP-01.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel). Sauvegarde de l'ancien historique : `C:\Users\HP\tools\backup-bic-gouv-sn.git`.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : dans `apps/api`, après `pnpm build` : `PORT=3100 NEWS_STORE_PATH=C:/bic-gouv-sn/.data/news.json MEDIA_ROOT=C:/bic-gouv-sn/.data/media pnpm start` (le DSN Sentry est lu dans `.env.local`).
- Vérification visuelle : export web (`expo export --clear`, API via relais du serveur local port 8084) + Chrome headless (émulation mobile).
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur, jamais via le shell.
