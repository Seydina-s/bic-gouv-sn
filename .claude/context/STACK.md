# STACK — Bic Gouv SN (état réel au 25/09/2026)

Stack validé par l'utilisateur le 24/09/2026 (CLAUDE.md §4.1). Toute dérogation passe par `decisions.md`. Versions épinglées dans les `package.json` et `pnpm-lock.yaml`.

## Socle

| Élément | Choix réel | Remarque |
|---|---|---|
| Runtime | Node 24 LTS (via fnm, `.node-version`) | Node 20 système conservé pour les autres projets |
| Monorepo | pnpm 12 (workspaces `apps/*`, `services/*`, `packages/*`) | `engineStrict`, scripts d'installation bloqués sauf `esbuild` et `@sentry/cli` |
| Langage | TypeScript 6.0 strict (+ `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`…) | TS 7 dès que typescript-eslint le supporte (T-01) |
| Qualité | ESLint 10 (typescript-eslint `strictTypeChecked`, react-hooks), Prettier 3 | |
| Tests | Vitest 5 (paquets, API, admin, ingestion), jest-expo + Testing Library RN 14 (mobile) | couverture ≥ 80 % imposée |
| CI | GitHub Actions : qualité, builds de production, sécurité (gitleaks, `pnpm audit` ≥ high) | actions épinglées par SHA, runner `ubuntu-24.04`, Dependabot |

## Paquets partagés

| Paquet | Rôle |
|---|---|
| `@bgs/shared-types` | Schémas Zod 4 : modèle de contenu, contrats API, catalogue d'erreurs (source unique des codes) |
| `@bgs/ui` | Tokens de design clair/sombre (couleurs du drapeau, typographie, espacements, mouvements, classes de fenêtre) |
| `@bgs/i18n` | Catalogues FR (référence) / WO (en attente de locuteurs natifs), admin FR, pluriels, repli signalé |
| `@bgs/resilience` | Délai, nouvelles tentatives avec gigue, disjoncteur, composition |
| `@bgs/content-store` | Stockage des articles avec historique des versions (fichier JSON provisoire → PostgreSQL en Phase 1) |

## Applications et services

| Élément | Technologie | État |
|---|---|---|
| `apps/mobile` | Expo SDK 57 (React Native 0.86, Hermes, New Architecture), Expo Router, TanStack Query + AsyncStorage, FlashList, expo-image, react-native-svg, Phosphor (import par icône), Sentry RN (inactif sans DSN) | Fil + article + onglets ; design en attente de choix (D-05) |
| `apps/api` | Fastify 5, fastify-type-provider-zod (OpenAPI 3.1), helmet, rate-limit, Sentry Node (via `--import`), build tsdown | `/v1/health`, `/v1/health/ready`, `/v1/news`, `/v1/news/:id` |
| `apps/admin` | Next.js 16 (App Router), Tailwind CSS 4, Phosphor, CSP | Écran « État du service » |
| `services/ingestion` | Adaptateur API JSON publique de presidence.sn (dérogation : Firecrawl en repli), sanitize-html, UUID v5 | Import historique fait (961 articles), veille temps réel prête |

## Pas encore en place (prévu)

PostgreSQL + PostGIS + pgvector, Meilisearch/Typesense, Redis + BullMQ, stockage objet + CDN, MapLibre + PMTiles, hébergement (S1-02), EAS Build (A-02), Maestro (E2E), k6 (charge), OpenTelemetry/Prometheus/Grafana, PostHog.
