# STATUS — Bic Gouv SN

**Dernière mise à jour** : 25/09/2026 (après-midi) · **Mode** : autonome

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn (historique nettoyé, ancien dépôt archivé en privé ).  protégée : tout passe par PR + 3 contrôles verts.
- Tranche verticale fusionnée dans  : collecte presidence.sn (961 articles, 717 photos), API /v1/news (filtre rubrique, ETag), app « La Une » + motifs du pagne tissé + barre en verre dépoli (D-05, choix utilisateur).
- Sentry : DSN en  (API + mobile), message de test reçu ; plugin Expo prêt pour les source maps.
- 450 tests, contrôle complet vert.

## En attente de l'utilisateur
1. Mettre le jeton Sentry en secret GitHub : dépôt → Settings → Secrets and variables → Actions → New repository secret, nom  (ne jamais le coller dans le chat).
2. Avis sur « La Une » vu sur iPhone (QA-04).
3. W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; S1-02 budget d'hébergement.

## Prochaine tâche
MED-02 (PDF et images du corps des articles stockés chez nous), puis UPG-01 (Expo SDK 58), PERF-03/04, WO-01, VID-01, RESP-01.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : `PORT=3100 NEWS_STORE_PATH=C:/bic-gouv-sn/.data/news.json MEDIA_ROOT=C:/bic-gouv-sn/.data/media node --import ./dist/instrument.mjs dist/server.mjs` (dans `apps/api`, après `pnpm build`).
- Vérification visuelle : export web (`expo export --clear`, API via relais du serveur local port 8084) + Chrome headless (émulation mobile).
- Pas de Python sur la machine : scripts en Node.
