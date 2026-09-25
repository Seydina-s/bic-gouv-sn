# STATUS — Bic Gouv SN

**Dernière mise à jour** : 25/09/2026 (après-midi) · **Mode** : autonome

## Où on en est
- Sprint 0 (fondations) clos. Tranche verticale VS-01…VS-06 faite : collecte presidence.sn → stockage → API `/v1/news` → fil + article dans l'app (PR #7 `feat/news-vertical-slice`, CI verte).
- Historique complet importé (961 articles, 2019 → 2026) ; détection temps réel prête (`pnpm --filter @bgs/ingestion watch`).
- **MED-01 fait** : photos de couverture (original + variantes AVIF/WebP/JPEG 480/960, SSIM ≥ 0,98, BlurHash), servies par l'API (`/media`) et affichées dans l'app. Photos de l'historique importées : 717 articles illustrés sur 961 (les autres n'ont pas de photo à la source).
- BUG-01 corrigé : cache hors ligne versionné par empreinte automatique du format d'API.
- 428 tests, contrôle complet vert.

## En attente de l'utilisateur
1. D-05 : choisir une direction visuelle sur la planche https://claude.ai/artifact/WviS1JMDtvTWSvZV6WsXrq
2. MON-01 : créer le compte Sentry, puis mettre les 2 DSN dans les secrets GitHub/EAS (jamais dans le chat).
3. CI-01 : protection de `main` (GitHub Pro 4 $/mois ou dépôt public) ; en attendant, fusion uniquement par PR à CI verte.
4. QA-02 : captures sur vrai téléphone (ou émulateur Android Studio).
5. W-01 locuteurs wolof ; A-01 logo/icônes officiels ; A-02 identifiant de l'app ; L-02 questions au BIC ; SEC-01 vulnérabilités Expo ; S1-02 budget d'hébergement.

## Prochaine tâche
MED-02 (PDF et images du corps des articles) ou PERF-03 (alléger le bundle), WO-01, VID-01.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : `PORT=3100 NEWS_STORE_PATH=C:/bic-gouv-sn/.data/news.json MEDIA_ROOT=C:/bic-gouv-sn/.data/media node --import ./dist/instrument.mjs dist/server.mjs` (dans `apps/api`, après `pnpm build`).
- Vérification visuelle : export web (`expo export --clear`, API via relais du serveur local port 8084) + Chrome headless (émulation mobile).
- Pas de Python sur la machine : scripts en Node.
