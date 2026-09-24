# STATUS — Bic Gouv SN

**Dernière mise à jour** : 24/09/2026 · **Mode** : standard

## Où on en est
- Phase 0 terminée ; stack validé (voir decisions.md).
- Dépôt privé https://github.com/Seydina-s/bic-gouv-sn (`main` + `chore/foundations`).
- Outils : pnpm 12.6.0, GitHub CLI 2.101, Node 24.21 isolé via fnm.

## En attente de l'utilisateur
1. Feu vert pour F-02 (monorepo).
2. Compte Sentry gratuit à créer quand F-12 arrivera.

## Prochaine tâche
F-02 — monorepo pnpm, TypeScript strict, ESLint/Prettier.

## Constat environnement
- Node système 20.20.0 (inchangé, pour les autres projets). Projet : Node 24 via `fnm exec --using=24` (FNM_DIR=`C:\Users\HP\tools\fnm\data`).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (PATH utilisateur).
- Projet conservé à `C:\bic-gouv-sn` (chemins courts, hors OneDrive).
