# STATUS — Bic Gouv SN

**Dernière mise à jour** : 24/09/2026 · **Mode** : standard

## Où on en est
- Phase 0 terminée ; stack validé (voir decisions.md).
- Dépôt privé https://github.com/Seydina-s/bic-gouv-sn (`main` + `chore/foundations`).
- Monorepo pnpm en place (F-02) : TypeScript 6.0 strict, ESLint, Prettier.
- Modèle de contenu (F-03) : `packages/shared-types`, schémas Zod, 37 tests, couverture 100 %.
- Design tokens (F-04) : `packages/ui`, thèmes clair/sombre, contraste AA testé (71 tests).
- i18n (F-05) : `packages/i18n`, FR de référence, WO vide en attente de locuteurs natifs (32 tests).
- Résilience (F-06) : `packages/resilience`, timeout / retry / circuit breaker (30 tests).
- App mobile (F-07) : `apps/mobile`, Expo SDK 57, thème live + langue (10 tests). Non testée sur appareil réel.
- Outils : pnpm 12.6.0, GitHub CLI 2.101, Node 24.21 isolé via fnm.

## En attente de l'utilisateur
1. Feu vert pour F-08 (API Fastify `/v1/health`).
2. Compte Sentry gratuit à créer quand F-12 arrivera.
3. W-01 : qui rédige et valide le wolof de l'interface ?
4. A-01 logo/icônes officiels ; A-02 identifiant de publication de l'app.

## Prochaine tâche
F-08 — `apps/api` : Fastify `/v1/health` + OpenAPI.

## Constat environnement
- Node système 20.20.0 (inchangé, pour les autres projets). Projet : Node 24 via `fnm exec --using=24` (FNM_DIR=`C:\Users\HP\tools\fnm\data`).
- Pour les commandes du projet : ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH (ou `fnm exec --using=24`).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (PATH utilisateur).
- Projet conservé à `C:\bic-gouv-sn` (chemins courts, hors OneDrive).
