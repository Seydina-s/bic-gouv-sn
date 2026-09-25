# STATUS — Bic Gouv SN

**Dernière mise à jour** : 25/09/2026 · **Mode** : standard

## Où on en est
- Sprint 0 (fondations) : tâches F-01 à F-12 terminées. 294 tests, CI verte (PR #1 `chore/foundations` → `main`).
- `packages/` : shared-types (Zod, catalogue d'erreurs), ui (tokens clair/sombre audités), i18n (FR ; WO vide en attente de locuteurs natifs), resilience.
- `apps/` : mobile (Expo SDK 57, polices, thème live), api (Fastify /v1/health, OpenAPI), admin (Next.js, écran « État du service »).
- Sentry intégré (API + mobile), **inactif tant qu'aucun DSN n'est fourni**.
- Design : Impeccable actif, PRODUCT.md écrit ; univers visuel au 1er écran citoyen (D-04).
- Critère de sortie du sprint encore non vérifié : « app vide déployable Android/iOS » (build EAS, nécessite la connexion Expo).

## En attente de l'utilisateur
1. Créer le compte Sentry (guide donné le 25/09/2026) puis fournir les 2 DSN (MON-01).
2. Protection de `main` : GitHub Pro (4 $/mois) ou autre option (CI-01).
3. Connexion du CLI Expo (`npx expo login --browser`) : nécessaire pour tester sur téléphone et pour le build EAS.
4. W-01 : qui rédige et valide le wolof de l'interface ?
5. A-01 logo/icônes officiels ; A-02 identifiant de publication de l'app.
6. Confirmer l'acceptation temporaire des 2 vulnérabilités modérées Expo (SEC-01).

## Prochaine tâche
Clôture du Sprint 0 : vérifier le critère « déployable » (build EAS), puis rituel d'audit croisé de fin de sprint (CLAUDE.md §11) et fusion de la PR #1.

## Constat environnement
- Node système 20.20.0 (inchangé, pour les autres projets). Projet : Node 24 via `fnm exec --using=24` (FNM_DIR=`C:\Users\HP\tools\fnm\data`).
- Pour les commandes du projet : ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH (ou `fnm exec --using=24`).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (PATH utilisateur).
- Projet conservé à `C:\bic-gouv-sn` (chemins courts, hors OneDrive).
- Captures d'écran : Chrome headless piloté par le protocole DevTools (émulation mobile réelle).
