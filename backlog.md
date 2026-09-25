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
| F-02 | Monorepo pnpm (apps/, services/, packages/, infra/, docs/), TypeScript strict partagé, ESLint/Prettier | ✅ | 24/09/2026 — TS 6.0 strict, ESLint strictTypeChecked, Prettier ; vérifié : erreurs volontaires détectées, audit 0 vulnérabilité |
| F-03 | `packages/shared-types` : schémas Zod du modèle de contenu (source_url, source_published_at, fetched_at, content_hash, version, lang, translations[], audio[], embedding) + tests | ✅ | 24/09/2026 — Zod 4.6, 37 tests, couverture 100 % ; doc `docs/data-model.md` ; 1 bug trouvé et corrigé (ERREURS.md) |
| F-04 | `packages/ui` : tokens `bgs.*` clair/sombre, échelles 50→900 des couleurs de la charte, contraste AA vérifié par test | ✅ | 24/09/2026 — 42 paires contrôlées (2 thèmes), 71 tests, couverture 100 % ; variables CSS `--bgs-*` pour l'admin ; ombres reportées à F-07 (spécifiques RN/web) |
| F-05 | `packages/i18n` : socle FR/WO, aucune chaîne en dur | ✅ | 24/09/2026 — clés typées, repli FR signalé, pluriels FR/WO, 32 tests, couverture 100 % (branches 98 %) ; catalogue wolof vide en attente de locuteurs natifs (W-01) |
| F-06 | `packages/resilience` : timeout, retry + jitter, circuit breaker + tests | ✅ | 24/09/2026 — 30 tests (horloge simulée, stables sur 3 exécutions), couverture 100 % ; codes `RESILIENCE_*` à reporter dans F-11 |
| F-07 | `apps/mobile` : Expo vide (New Architecture, Hermes, Expo Router), thème live | ✅ | 24/09/2026 — SDK 57 ; expo-doctor 21/21 ; bundles Android + iOS Hermes OK ; 10 tests (thème live vérifié par mutation) ; pas encore testé sur un vrai téléphone |
| F-08 | `apps/api` : Fastify `/v1/health` + OpenAPI | ✅ | 24/09/2026 — 10 tests (couverture 100 %) + test réel du build de production par HTTP ; contrats partagés dans `shared-types/src/api` |
| F-09 | `apps/admin` : Next.js vide | ✅ | 24/09/2026 — coquille + écran « État du service » (réel) ; 22 tests (100 %) ; build + captures bureau/mobile, clair/sombre, service OK/KO ; détecteur Impeccable : 0 anomalie |
| F-10 | CI GitHub Actions : lint, typecheck, tests, scan de secrets, audit des dépendances | ✅ | 24/09/2026 — 3 jobs verts sur la PR #1 (qualité, builds prod, sécurité) ; Dependabot ; actions épinglées par SHA |
| F-11 | `docs/errors-catalog.md` : structure du catalogue d'erreurs lisible | ✅ | 24/09/2026 — 10 codes, type `ErrorCode` imposé, doc générée et testée, admin branché dessus |
| F-12 | Observabilité de base (Sentry mobile + API) | ✅ | 25/09/2026 — intégration prête, inactive sans DSN ; tests (API 17, mobile 18) ; build mobile avec DSN vérifié ; activation = MON-01 |

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
| 24/09/2026 | T-01 🔴 Passer à TypeScript 7 dès que typescript-eslint le supporte | F-02 |
| 24/09/2026 | W-01 🔴 Identifier qui rédige et valide les textes wolof de l'interface (catalogue `packages/i18n/src/messages/wo.ts`) | F-05 |
| 24/09/2026 | A-01 🔴 Logo officiel, icônes d'app et écran de lancement (actuellement icônes génériques du modèle Expo — à remplacer, ne rien inventer) | F-07 |
| 24/09/2026 | A-02 🔴 Identifiant de publication de l'app (ex. `sn.gouv.bic…`) à valider avec le BIC avant tout build de store | F-07 |
| 24/09/2026 | PERF-01 🔴 Expo Router embarque une police d'icônes Material Symbols de 967 Ko : vérifier si elle peut être exclue (budget de poids S1-03) | F-07 |
| 24/09/2026 | SEC-01 🔴 Revérifier `pnpm audit` à chaque mise à jour du SDK Expo (decode-uri-component via expo-router, uuid via xcode) ; bloquer en CI toute vulnérabilité haute/critique | F-08 |
| 24/09/2026 | API-01 🔴 Ajouter rate limiting, en-têtes de sécurité et sonde de disponibilité (readiness) quand la base de données arrivera | F-08 |
| 24/09/2026 | D-01 ✅ Audit des tokens de design + corrections (docs/design/audit-tokens-2026-09-24.md) | Demande utilisateur |
| 24/09/2026 | D-02 🔴 `/impeccable init` (PRODUCT.md + DESIGN.md) au début de la prochaine session | Audit D-01 |
| 24/09/2026 | D-03 🔴 Réparer l'installation de ui-ux-pro-max (dossiers data/scripts = liens cassés) + Python pour ses scripts | Audit D-01 |
| 24/09/2026 | PERF-02 🔴 Sous-ensemble des polices (latin + wolof) pour réduire les 564 Ko | Audit D-01 |
| 24/09/2026 | Q-01 ✅ Délai des tests porté à 30 s (échec intermittent sous charge : 12,6 s pour un démarrage à froid) | Contrôle complet |
| 24/09/2026 | D-02 ✅ PRODUCT.md écrit (init Impeccable) | F-09 |
| 24/09/2026 | D-04 🔴 Tour de directions visuelles Impeccable + DESIGN.md au premier écran citoyen (Phase 2) | Décision utilisateur |
| 24/09/2026 | CI-01 🔴 Activer la protection de la branche `main` (CI verte obligatoire, pas de push direct) — accord utilisateur requis | F-10 |
| 24/09/2026 | CI-02 🔴 Passer le runner à Ubuntu 26.04 de façon délibérée (ubuntu-latest y bascule le 19/10/2026) | F-10 |
| 25/09/2026 | MON-01 🔴 Après création du compte Sentry : DSN dans les variables d'environnement, plugin `@sentry/react-native/expo` + `getSentryExpoConfig` (source maps), `SENTRY_AUTH_TOKEN` en secret EAS/CI, désactiver le stockage des IP côté projet | F-12 |
| 25/09/2026 | MON-02 🔴 Sentry pour l'admin Next.js (hors périmètre F-12) | F-12 |
