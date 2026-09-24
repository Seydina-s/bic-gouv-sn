# backlog.md — Bic Gouv SN

Source de vérité unique de l'avancement. Mis à jour en temps réel. Aucune tâche n'est supprimée, seul son état change.

États : 🔴 À faire · 🔵 En cours · ✅ Terminé · ⏸ En pause · ❌ Abandonnée (raison notée)

**Mode actif : standard** (chaque tâche significative est validée par l'utilisateur).

---

## Phase 0 — Contextualisation (CLAUDE.md §3)

| # | Tâche | État | Notes |
|---|---|---|---|
| P0-01 | Lire CLAUDE.md, contexte, STATUS, ERREURS-GLOBALES | ✅ | 24/09/2026 — seul CLAUDE.md existait |
| P0-02 | Relever la police et la structure de la maquette | ✅ | Bricolage Grotesque + Manrope ; 5 onglets confirmés |
| P0-03 | Initialiser les fichiers de pilotage (backlog, decisions, ERREURS, contexte, session, ERREURS-GLOBALES) | ✅ | 24/09/2026 |
| P0-04 | Obtenir les réponses aux questions groupées de démarrage | ✅ | 24/09/2026 — réponses reçues, voir decisions.md |

## Phase 1 — Validation du stack (CLAUDE.md §4)

| # | Tâche | État | Notes |
|---|---|---|---|
| S1-01 | Présenter le stack §4.1 à l'utilisateur pour validation explicite | ✅ | 24/09/2026 — validé ; Node 22 LTS recommandé |
| S1-02 | Chiffrer l'hébergement (région proche Afrique de l'Ouest + CDN) | 🔴 | Dépend de S1-01 |
| S1-03 | Fixer le budget de poids de l'app (contrôlé en CI) | 🔴 | |
| S1-04 | Comparatif typographique : Bricolage/Manrope vs 2–3 alternatives (glyphes wolof ë é à ó ñ ŋ, petites tailles, poids, licence) | 🔴 | Choix final par l'utilisateur |
| S1-05 | Rédiger `.claude/context/STACK.md` avec le stack validé | 🔴 | Après S1-01 |

## Sprint 0 — Fondations (feuille de route Phase 0 technique)

Critère de sortie : CI verte, app vide déployable Android/iOS.

| # | Tâche | État | Notes |
|---|---|---|---|
| F-01 | `git init`, branche `chore/foundations`, `.gitignore`, `.editorconfig` | ✅ | 24/09/2026 — dépôt privé github.com/Seydina-s/bic-gouv-sn |
| F-02 | Monorepo pnpm (apps/, services/, packages/, infra/, docs/), TypeScript strict partagé, ESLint/Prettier | 🔴 | pnpm 12.6.0 installé le 24/09/2026 |
| F-03 | `packages/shared-types` : schémas Zod du modèle de contenu (source_url, source_published_at, fetched_at, content_hash, version, lang, translations[], audio[], embedding) + tests | 🔴 | Couverture ≥ 80 % |
| F-04 | `packages/ui` : tokens `bgs.*` clair/sombre, échelles 50→900 des couleurs de la charte, contraste AA vérifié par test | 🔴 | |
| F-05 | `packages/i18n` : socle FR/WO, aucune chaîne en dur | 🔴 | |
| F-06 | `packages/resilience` : timeout, retry + jitter, circuit breaker + tests | 🔴 | |
| F-07 | `apps/mobile` : Expo vide (New Architecture, Hermes, Expo Router), thème live | 🔴 | |
| F-08 | `apps/api` : Fastify `/v1/health` + OpenAPI | 🔴 | |
| F-09 | `apps/admin` : Next.js vide | 🔴 | |
| F-10 | CI GitHub Actions : lint, typecheck, tests, scan de secrets, audit des dépendances | 🔴 | Nécessite un dépôt GitHub (question utilisateur) |
| F-11 | `docs/errors-catalog.md` : structure du catalogue d'erreurs lisible | 🔴 | |
| F-12 | Observabilité de base (Sentry mobile + API) | 🔴 | Nécessite un compte Sentry (question utilisateur) |

## Phases suivantes (à détailler au fil de l'eau)

| Phase | Contenu | État |
|---|---|---|
| 1 — Ingestion | Firecrawl, cartographie sources, backfill FR+WO, temps réel, images, quarantaine | 🔴 |
| 2 — App cœur | Splash, onboarding, fil, article, recherche, favoris, hors ligne, push, responsive + pliables | 🔴 |
| 3 — Carte | Données services (admin), MapLibre, proximité, fiches, hors ligne | 🔴 |
| 4 — Admin | Tableaux de bord, supervision, journal d'erreurs simple, notifications, flags | 🔴 |
| 5 — Démarches & Participer | e-senegal.sn, fiches visuelles ; Participer après cadrage | 🔴 |
| 6 — IA | Wolof manquant, TTS/ASR, RAG, benchmark vs AWA | 🔴 |
| 7 — Lancement | Charge 20 M, pentest, conformité stores, bêta | 🔴 |

## Ajouts en cours de route

| Date | Ajout | Origine |
|---|---|---|
| 24/09/2026 | Écart de couleurs maquette ↔ charte : la charte prévaut (voir decisions.md) | Lecture de la maquette |
| 24/09/2026 | La maquette contient une section « Opportunités » (financements, concours, marchés publics) absente du périmètre CLAUDE.md → à trancher par l'utilisateur | Lecture de la maquette |
| 24/09/2026 | Emplacement du dossier projet vérifié : conservé à `C:\bic-gouv-sn` (voir decisions.md) | Question utilisateur |
| 24/09/2026 | O-01 🔴 Section « Opportunités » conservée : définir contenu, sources officielles et priorité | Réponse utilisateur |
| 24/09/2026 | S1-06 ✅ Node 24 LTS isolé par projet via fnm (Node 20 système conservé) | Revue du stack |
| 24/09/2026 | L-01 🔴 Obtenir la preuve écrite d'autorisation de la Présidence avant soumission aux stores | Réponse utilisateur |
