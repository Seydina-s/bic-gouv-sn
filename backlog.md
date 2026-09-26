# backlog.md — Bic Gouv SN

Source de vérité unique de l'avancement. Mis à jour en temps réel. Aucune tâche n'est supprimée, seul son état change.

États : 🔴 À faire · 🔵 En cours · ✅ Terminé · ⏸ En pause · ❌ Abandonnée (raison notée)

**Mode actif : autonome** depuis le 25/09/2026 (demande explicite de l'utilisateur ; décisions notées « Claude (autonome) »).

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
| S1-03 | Fixer le budget de poids de l'app (contrôlé en CI) | ✅ | 25/09/2026 — plafond 6 Mo par bundle JS (Hermes), cible 4 Mo après PERF-03 ; mesuré : Android 5,16 Mo, iOS 4,88 Mo ; étape CI « Mobile bundle weight budget » |
| S1-04 | Comparatif typographique : Bricolage/Manrope vs 2–3 alternatives (glyphes wolof ë é à ó ñ ŋ, petites tailles, poids, licence) | 🔴 | Choix final par l'utilisateur |
| S1-05 | Rédiger `.claude/context/STACK.md` avec le stack validé | ✅ | 25/09/2026 — état réel, dérogations et éléments à venir |

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
| 24/09/2026 | PERF-01 ✅ Expo Router embarque une police d'icônes Material Symbols de 967 Ko : exclue le 26/09/2026 (import d'expo-symbols par les « onglets natifs » inutilisés redirigé vers un module vide, comme pour Zod) ; Android 6,58 → 5,57 Mo | F-07 |
| 24/09/2026 | SEC-01 🔴 Revérifier `pnpm audit` à chaque mise à jour du SDK Expo (decode-uri-component via expo-router, uuid via xcode) ; bloquer en CI toute vulnérabilité haute/critique | F-08 |
| 24/09/2026 | API-01 ✅ (25/09) Limitation de débit (600/min/adresse, CGNAT), en-têtes de sécurité (CSP stricte en production), sonde `/v1/health/ready` ; 43 tests API | F-08 |
| 24/09/2026 | D-01 ✅ Audit des tokens de design + corrections (docs/design/audit-tokens-2026-09-24.md) | Demande utilisateur |
| 24/09/2026 | D-02 🔴 `/impeccable init` (PRODUCT.md + DESIGN.md) au début de la prochaine session | Audit D-01 |
| 24/09/2026 | D-03 🔴 Réparer l'installation de ui-ux-pro-max (dossiers data/scripts = liens cassés) + Python pour ses scripts | Audit D-01 |
| 24/09/2026 | PERF-02 ✅ Sous-ensemble des polices (latin + wolof) pour réduire les 564 Ko — réalisé avec PERF-04 (26/09/2026) | Audit D-01 |
| 24/09/2026 | Q-01 ✅ Délai des tests porté à 30 s (échec intermittent sous charge : 12,6 s pour un démarrage à froid) | Contrôle complet |
| 24/09/2026 | D-02 ✅ PRODUCT.md écrit (init Impeccable) | F-09 |
| 24/09/2026 | D-04 🔴 Tour de directions visuelles Impeccable + DESIGN.md au premier écran citoyen (Phase 2) | Décision utilisateur |
| 24/09/2026 | CI-01 ⏸ Protection de la branche `main` : accord donné le 25/09/2026, mais **refusée par GitHub** (dépôt privé en offre gratuite : nécessite GitHub Pro, 4 $/mois, ou un dépôt public). En attente de décision ; d'ici là, règle appliquée : jamais de push direct sur `main`, fusion uniquement par PR avec CI verte | F-10 | 
| 24/09/2026 | CI-02 🔴 Passer le runner à Ubuntu 26.04 de façon délibérée (ubuntu-latest y bascule le 19/10/2026) | F-10 |
| 25/09/2026 | MON-01 🔴 Après création du compte Sentry : DSN dans les variables d'environnement, plugin `@sentry/react-native/expo` + `getSentryExpoConfig` (source maps), `SENTRY_AUTH_TOKEN` en secret EAS/CI, désactiver le stockage des IP côté projet | F-12 |
| 25/09/2026 | MON-02 🔴 Sentry pour l'admin Next.js (hors périmètre F-12) | F-12 |

## Rituel de fin de Sprint 0 — audit croisé (25/09/2026)

| # | Agent | Constat → tâche | Priorité |
|---|---|---|---|
| AUD-01 | Orchestrateur | `.claude/context/STACK.md` jamais rédigé (S1-05) ; S1-02 (hébergement), S1-03 (budget de poids), S1-04 (typographie) toujours ouverts | Haute |
| AUD-02 | Ingestion & Données | Avant toute collecte : vérifier `robots.txt` et les conditions d'utilisation de presidence.sn, fixer un débit poli, documenter dans `docs/sources.md` | Bloquante pour VS-02 |
| AUD-03 | Sécurité | Admin : ajouter une Content-Security-Policy ; **ne jamais déployer l'admin en public avant l'authentification 2FA (Phase 4)** | Haute |
| AUD-04 | Sécurité (challenge Architecte) | API sans limitation de débit ni en-têtes de sécurité (API-01) : à faire avant toute exposition publique | Haute |
| AUD-05 | QA | Aucun test de bout en bout (Maestro) ni test lecteur d'écran / grande police sur appareil : à mettre en place avec les premiers écrans réels | Moyenne |
| AUD-06 | Performance | Budget de poids non contrôlé en CI ; police Material Symbols 967 Ko (PERF-01) ; sous-ensemble des polices (PERF-02) | Moyenne |
| AUD-07 | Design (challenge Développeur) | L'accueil mobile est un gabarit technique : aucun écran citoyen avant le tour de directions visuelles (D-04) | Haute (VS-05) |
| AUD-08 | Copywriter | Wolof de l'interface sans rédacteur désigné (W-01) : bloquera la parité FR/WO des premiers écrans | Moyenne |

## Tranche verticale « premiers vrais articles »

| # | Tâche | État | Notes |
|---|---|---|---|
| VS-01 | Cartographie minimale de presidence.sn/fr : robots.txt, conditions d'utilisation, page de liste des actualités, structure d'un article → `docs/sources.md` | ✅ | 25/09/2026 — API JSON publique du site trouvée ; FR 1 014 / WO 318 ; liaison FR↔WO par `articleId` ; wolof officiel arrêté au 01/10/2025 |
| VS-02 | `SourceProvider` + premier adaptateur (API JSON de presidence.sn, sous réserve de validation) : collecte de quelques articles FR, validés par `newsArticleSchema`, traçables (URL, date de collecte, empreinte) | ✅ | 25/09/2026 — adaptateur API presidence.sn (débit 1 req/s, disjoncteur, 3 essais, quarantaine) ; HTML nettoyé ; id stable UUID v5 ; 27 tests (100 % des lignes) ; **collecte réelle : 8/8 articles valides** ; images et PDF reportés au pipeline média |
| VS-03 | Stockage provisoire des articles validés (remplacé par PostgreSQL en Phase 1) | ✅ | 25/09/2026 — `@bgs/content-store` (interface + fichier JSON atomique, historique des versions) ; fusion FR/WO ; collecte réelle 8 FR + 8 WO, re-passage = 0 doublon |
| VS-04 | API `GET /v1/news` (liste) et `GET /v1/news/:id` (détail), schémas partagés, cache HTTP | ✅ | 25/09/2026 — texte en blocs structurés (pas de HTML vers l'app), ETag + 304, stale-while-revalidate, filtre langue, pagination par curseur ; 37 tests API ; vérifié sur les 16 vrais articles |
| VS-05 | Tour de directions visuelles Impeccable (univers de la marque) sur l'accueil / fil d'actualité | ✅ | 25/09/2026 — « le pagne tissé » (décision déléguée, decisions.md) |
| VS-06 | App : fil d'actualité + écran article avec les vrais articles, attribution « Source : presidence.sn » + lien | 🔵 | 25/09/2026 — fonctionnel : 5 onglets, fil en bandes tissées, article en blocs natifs, hors ligne, « Dernière lecture » ; 28 tests ; rendu vérifié en aperçu web (clair/sombre/tablette). **Revue de finition Impeccable : « recapture »** → captures sur vrais appareils requises (QA-02) avant verdict et DESIGN.md |

## Ajouts en cours de route (suite)

| Date | Ajout | Origine |
|---|---|---|
| 25/09/2026 | L-02 🔴 Questions au BIC : (1) autorisation d'utiliser l'API publique `bo-admin.presidence.sn/api/front` ; (2) webhook à chaque publication (fraîcheur < 2 min) ; (3) reprise de la publication officielle en wolof, arrêtée le 01/10/2025 | VS-01 |
| 25/09/2026 | DM-01 ✅ Modèle de contenu : la date de publication de la source est une date sans heure → champ date calendaire (pas d'heure inventée) + horodatages du back-office | VS-01 |
| 25/09/2026 | MED-01 ✅ Pipeline média (photos de couverture) : original conservé, variantes AVIF/WebP/JPEG 480/960 px à SSIM ≥ 0,98, BlurHash, servies par l'API (`/media`, CDN configurable) et affichées dans l'app (grande photo en tête, vignettes) ; historique importé : 717 articles illustrés sur 961 (les autres n'ont pas de photo à la source ; 1 échec : ancienne adresse bo.presidence.sn hors service) ; branché sur la détection temps réel. PDF et images dans le corps : MED-02 | VS-02 |
| 25/09/2026 | WO-01 ✅ (vérifié au navigateur le 26/09 : nos liens wolof ouvrent le bon article) URL canonique des pages wolof à vérifier (le plan du site utilise `/wo/actualites/-1017`, l'API des slugs wolof) | VS-02 |
| 25/09/2026 | QA-02 🔴 Captures sur vrais appareils (Android + iPhone, clair/sombre, grande police, bas d'un article avec la source) pour la revue de finition Impeccable ; option : émulateur Android (Android Studio, gratuit) | Revue VS-06 |
| 25/09/2026 | QA-03 🔴 Vérifier sur appareil l'espace vide sous certaines bandes (mesure FlashList, peut-être propre à l'aperçu web) | Revue VS-06 |
| 25/09/2026 | RESP-01 ✅ (26/09 : deux volets liste + article à partir de 840 dp, recalculés en direct au pliage/dépliage ; barre en verre plafonnée à 560 dp et centrée ; contrôlé en capture tablette clair/sombre) Grands écrans : deux volets liste + article, et rail de navigation (Material) au lieu de la barre du bas sur tablette | Revue VS-06 |
| 25/09/2026 | PERF-03 🔵 (−230 Ko : catalogue de langues de Zod retiré du paquet de l'app ; Android 5,19 → 4,96 Mo, iOS 4,91 → 4,68 Mo ; reste Sentry ≈ 880 Ko) Poids du bundle JS : 5,4 Mo (Hermes) ; gros postes : Sentry (~1,7 Mo source, dont replay inutilisé), Zod (~0,8 Mo) ; fixer le budget S1-03 et le contrôler en CI | VS-06 |
| 25/09/2026 | DS-01 ✅ (DESIGN.md + .impeccable/design.json relevés sur le code livré, fiche de surface mise à jour pour D-05) DESIGN.md (documenteur Impeccable) après verdict de la revue sur appareils | VS-06 |
| 25/09/2026 | AUD-03 ✅ (partiel) CSP de l'admin active (vérifiée sur build de production) ; règle maintenue : pas de déploiement public de l'admin avant 2FA (Phase 4) | Audit Sprint 0 |
| 25/09/2026 | SEC-03 🔴 Admin : CSP à nonce (supprimer `'unsafe-inline'` des scripts) via le proxy Next.js | AUD-03 |
| 25/09/2026 | D-05 ✅ (choix utilisateur : « La Une » + motifs du pagne tissé + navigation en verre dépoli, voir decisions.md) (planche prête : https://claude.ai/artifact/WviS1JMDtvTWSvZV6WsXrq — 5 directions : pagne tissé, journal parlé, la Une, sous-verre, classique épuré) L'utilisateur n'est pas convaincu par la direction « pagne tissé » (vue sur téléphone) : lui présenter 2-3 directions visuelles (planche de décision Impeccable, re-roll) et le laisser choisir | Retour utilisateur |
| 25/09/2026 | VID-01 ✅ (26/09 : vidéos YouTube intégrées par presidence.sn acceptées et normalisées sur youtube-nocookie ; carte « Regarder la vidéo » qui ouvre YouTube au toucher, sans lecteur intégré ; articles vidéo réimportés après l'import des images) Articles vidéo de presidence.sn (interviews sans texte, `video_url`) : 8 mis en quarantaine à l'import ; ajouter un bloc vidéo au modèle et à l'app | Import historique |
| 25/09/2026 | ING-01 ✅ Import complet de l'historique : 961 articles (15/04/2019 → 24/09/2026), 311 FR+WO, 94 Conseil des ministres ; 10 écartés (8 vidéos sans texte, 2 erreurs ponctuelles) | Phase 1 |
| 25/09/2026 | MED-02 🔵 Pièces jointes PDF et images du corps des articles : téléchargement, stockage chez nous (autonomie vis-à-vis de la source), liens réécrits vers notre CDN | MED-01 |
| 25/09/2026 | MED-03 🔴 Mode économie de données : vignettes masquées / plus petites variantes sur demande | MED-01 |
| 25/09/2026 | BUG-01 ✅ Plantage au démarrage avec un cache hors ligne de l'ancien format (sans photo) : cache versionné par empreinte automatique du contrat d'API (voir ERREURS.md) | MED-01 |
| 25/09/2026 | BUG-02 ✅ Faux « Hors ligne » sur iPhone : la version installée rejetait le nouveau champ `cover` ; schémas non stricts + lecteur tolérant (voir ERREURS.md) | QA-02 (captures iPhone) |
| 25/09/2026 | UI-01 ✅ Accueil « La Une » (bandeau tricolore, en-tête journal, photo pleine largeur, serif Literata, carte Conseil des ministres, lisières tissées) + article (photo pleine largeur, titre serif) + barre de navigation flottante en verre dépoli | D-05 |
| 25/09/2026 | QA-04 🔴 Valider « La Une » et la barre en verre sur l'iPhone de l'utilisateur et sur un Android d'entrée de gamme (fluidité 60 fps, lisibilité en plein soleil) | UI-01 |
| 25/09/2026 | PERF-04 ✅ Sous-ensemble des polices : 8 fichiers, 1 090 → 611 Ko (Literata 261 → 124 Ko par graisse) ; contrôle CI des lettres françaises et wolof (test de mutation fait) ; Ɓ Ɗ Ƴ absents des polices d'origine (à peser en S1-04) | UI-01 |
| 25/09/2026 | QA-02 🔵 Premières captures iPhone reçues (thème sombre OK, faux « Hors ligne » → BUG-02 corrigé) | Utilisateur |
| 25/09/2026 | CI-01 ⏸ Dépôt public : historique nettoyé localement (e-mail remplacé, sauvegarde faite) ; renommage de l'ancien dépôt, création du nouveau et push à faire par l'utilisateur (action bloquée par les permissions) | Utilisateur |
| 25/09/2026 | CI-01 ✅ Dépôt public sécurisé (nouveau dépôt, historique nettoyé, ancien dépôt archivé en privé ; protection de main, analyse des secrets avec blocage, Dependabot, signalement privé, actions épinglées, approbation des contributions externes) | Utilisateur |
| 25/09/2026 | MON-01 🔵 Sentry : DSN API et mobile configurés localement (`.env.local`, non versionnés), message de test reçu côté API ; plugin Expo + Metro prêts pour les source maps ; reste : `SENTRY_AUTH_TOKEN` en secret GitHub (utilisateur) puis secrets EAS au premier build (A-02), DSN côté hébergement (S1-02) | Utilisateur |
| 25/09/2026 | L-02 (ajout) Licence du code à décider avec le BIC (aucune licence libre pour l'instant) | CI-01 |
| 25/09/2026 | UPG-01 ⏸ (SDK 58 encore en préversion le 25/09/2026 : on attend la version stable) Montée vers Expo SDK 58 (react-native 0.87, expo-router 58, React et Jest alignés, Sentry RN 8) d'un bloc avec `expo install --fix`, puis tests sur appareils | Dependabot #1-#5 |
| 25/09/2026 | MED-02a ✅ Images du texte stockées chez nous (variantes, SSIM, BlurHash, rôle « inline »), API qui pointe vers nos copies, app qui les affiche avec leur description ; images hors sources officielles (réseaux sociaux) écartées ; ancienne adresse bo.presidence.sn (certificat invalide) remplacée par bo-admin.presidence.sn ; import de l'historique lancé. PDF : MED-02b | MED-02 |
| 25/09/2026 | MED-02b 🔴 PDF officiels (4 liens dans l'historique) stockés chez nous avec empreinte, taille et titre | MED-02 |
| 25/09/2026 | BUG-03 ✅ Fichier des articles remis à zéro par une coupure (écriture sans fsync) : écriture durable + copie de secours, médias contrôlés, reconstruction lancée (voir ERREURS.md) | Incident |
| 25/09/2026 | DATA-01 🔵 (26/09 : copie quotidienne automatique par la surveillance, 7 jours gardés, procédure docs/runbooks/restaurer-les-donnees.md ; reste la copie hors machine avec l'hébergement S1-02) Sauvegardes : en attendant PostgreSQL (sauvegardes automatiques), copie quotidienne de `.data/` hors de la machine | BUG-03 |
| 25/09/2026 | DS-02 ✅ Écarts relevés par la documentation corrigés : libellé de l'onglet actif lisible sur le verre dans tous les cas (test ajouté), dimensions et opacités passées en jetons (barre, bandeau, flou, filigrane, vignette, format de la une, espacement des capitales) | DS-01 |
| 26/09/2026 | FEED-01 ✅ Favoris (marque-page sur l'article, page « Mes favoris » depuis l'en-tête, article complet gardé sur le téléphone donc lisible hors ligne, sans compte) et partage (titre + lien vers la page officielle presidence.sn) | P0 fil |
| 26/09/2026 | FEED-02 ✅ (puces de rubrique avec leur motif tissé sous l'en-tête ; chaque rubrique a son cache hors ligne ; carte du Conseil réservée à « Tout ») Filtres par rubrique sur l'accueil | P0 fil |
| 26/09/2026 | FEED-03 ✅ (26/09 : route /v1/news/search — accents, casse et lettres wolof ignorés, tous les mots requis, titre en premier ; page « Rechercher » depuis l'en-tête, résultats pendant la frappe, messages sans résultat / hors ligne. Tolérance aux fautes : SEARCH-01 avec Meilisearch) Recherche dans les actualités (FR/WO, tolérante aux fautes ; Meilisearch en production) | P0 fil |
| 26/09/2026 | FEED-04 🔴 Notifications push par rubrique (opt-in, heures calmes) — nécessite un build natif (A-02) | P0 fil |
| 26/09/2026 | MED-04 🔵 223 échecs d'images du texte lors de la reconstruction (téléchargements OK ensuite : panne passagère probable + disjoncteur) ; cause désormais écrite dans chaque rapport ; relance de l'import prévue | Reconstruction |
| 26/09/2026 | SEARCH-01 🔴 Moteur Meilisearch (tolérance aux fautes, synonymes FR/WO) derrière la même route, et relevé des recherches sans résultat pour l'admin (agrégé, anonyme) | FEED-03 |
| 26/09/2026 | SET-01 ✅ Réglages : apparence (Comme le téléphone / Clair / Sombre) et langue (Comme le téléphone / Français / Wolof), mémorisées sur le téléphone ; section « À propos » indiquant que l'app relaie les informations officielles de presidence.sn (en attendant l'autorisation L-01) | Charte |
| 26/09/2026 | ING-02 ✅ Écarté à juste titre : 1 article fait d'un lecteur externe (Issuu) qui exige un script tiers | Import |
| 26/09/2026 | FEED-05 ✅ Hors ligne : le bandeau indique l'âge des actualités affichées (« mis à jour il y a 2 heures »), comme prévu par la chaîne de repli de CLAUDE.md | Résilience |
| 26/09/2026 | ONB-01 ✅ Accueil au premier lancement : choix de la langue puis 3 écrans (une idée chacun, avec un vrai morceau de l'app en démonstration), « Passer » toujours visible, mémorisé ; seules les fonctions existantes sont présentées ; permissions demandées plus tard, au moment utile | Charte |
| 26/09/2026 | TYPO-01 ✅ Typographie française : espace insécable avant « : » et dans « », vérifiée par un test sur tout le catalogue | UX writing |
| 26/09/2026 | SPLASH-01 ⏸ Splash niveau motion design (Rive, référence : les meilleures apps actuelles), à partir du logo fourni par l'utilisateur (A-01) ; baobab tracé trait par trait < 1,5 s, jamais bloquant | Charte + demande utilisateur 26/09 |
| 26/09/2026 | ADM-01 ✅ Supervision de la collecte dans l'administration : rapport écrit par la surveillance après chaque passage (écriture durable), exposé en lecture seule par l'API (/v1/status/ingestion, sans donnée personnelle), verdict en français simple (à jour / en échec / arrêtée / inconnue) avec « Que faire ? » tiré du catalogue d'erreurs ; temps de détection mesuré seulement pour les changements survenus pendant la surveillance | Phase 4 |
| 26/09/2026 | ADM-02 🔵 Authentification de l'administration (2FA obligatoire, rôles, journal d'audit) avant toute mise en ligne de la console — décision de l’utilisateur (26/09) : développée en interne (e-mail + mot de passe (scrypt) + TOTP obligatoire, rôles relecteur / éditeur / administrateur, sessions courtes, journal d’audit immuable) | Phase 4 |
| 26/09/2026 | ADM-02a ✅ Socle de sécurité `packages/admin-auth` : mots de passe (scrypt, comparaison à temps constant), second code TOTP (vecteurs officiels RFC 6238, anti-rejeu, dérive d’horloge ±30 s), rôles relecteur / éditeur / administrateur par permission, sessions (jeton haché, 30 min d’inactivité, 8 h max), verrouillage après 5 échecs, journal d’audit chaîné (toute modification détectée) ; couverture 98 % | Phase 4 |
| 26/09/2026 | ADM-02b 🔴 API de connexion (comptes, sessions, cookies sécurisés, limitation par adresse, création du premier administrateur en ligne de commande, stockage durable) | Phase 4 |
| 26/09/2026 | ADM-02c 🔴 Écrans de connexion du centre d’administration (mot de passe, activation du second code par QR code, déconnexion) et protection de toutes les pages | Phase 4 |
| 26/09/2026 | S1-03b ✅ Budget de poids : 15 Mo pour l'app entière, 6 Mo pour le code (contrôlé en CI) — décision utilisateur | Utilisateur |
| 26/09/2026 | UX-01 🔴 Expérience immersive : animations Rive (splash, transitions, onboarding), illustrations, onboarding plus intuitif — en attente des retours de l'utilisateur et du logo, avec benchmark des meilleures apps | Utilisateur |
| 26/09/2026 | DEM-01 ✅ Collecte des démarches d'e-senegal.sn (interface GraphQL publique du site, 1 requête/s) : modèle « démarche » traçable (lien vers la page publique), faits laissés vides plutôt qu'inventés, valeurs bouche-trous de la source écartées (« Q », « XXX »…), liens non sécurisés écartés, quarantaine si vide, versionnage ; stockage générique factorisé (VersionedJsonStore) | Phase 5 |
| 26/09/2026 | DEM-02 ✅ API /v1/procedures : liste alphabétique paginée, recherche (moteur partagé avec les actualités), fiche en blocs structurés avec lien officiel, cache et 304 ; thèmes non disponibles à la source (non inventés) | Phase 5 |
| 26/09/2026 | DEM-03 ✅ Onglet « Démarches » de l'app : recherche en tête (GOV.UK), nombre de démarches, faits connus en pastilles (coût, délai, en ligne ; inconnu = non affiché), fiche avec faits en cartes, « Qui peut faire la démarche », pièces à fournir en liste à cocher, texte officiel, FAQ, démarches liées, bouton « Faire la démarche sur e-senegal.sn » et mention de la source ; illustrations des étapes reportées à UX-01 | Phase 5 |
| 26/09/2026 | BUG-ART-01 ✅ Photo du haut d'un article : vide à droite sur téléphone (signalé par l'utilisateur) ; largeur explicite + test anti-régression | Retour utilisateur |
| 26/09/2026 | HOME-01 ✅ API : pages numérotées (`page`, `total`) et dernières actualités par rubrique en une requête (`/v1/news/sections`) | Retour utilisateur |
| 26/09/2026 | HOME-02 ✅ Identité des rubriques : un ton par rubrique (contraste AA contrôlé) et une icône par mot clé, sur les pastilles, filtres et lisières | Retour utilisateur |
| 26/09/2026 | HOME-03 ✅ Page de rubrique (`/section/[slug]`) : filtres en haut (la rubrique choisie défile en vue, « Tout » ramène à l’accueil), bandeau aux couleurs de la rubrique avec le nombre d’articles, 20 articles par page, pagination numérotée (1 … 4 5 6 … 12, page courante pleine, « Page 2 sur 12 ») ; les pastilles de l’accueil ouvrent cette page | Retour utilisateur |
| 26/09/2026 | HOME-04 ✅ Accueil : bandeau défilant (5 derniers articles avec photo, 5 s, glissable, pause au toucher et bouton pause, arrêt avec « réduire les animations » ou lecteur d'écran), carte du Conseil, une rangée horizontale de 10 cartes par rubrique (ordre du site officiel) + carte « Voir plus », espacements élargis ; une seule requête pour toutes les rangées | Retour utilisateur |
| 26/09/2026 | HOME-05 ✅ Bouton discret « Revenir en haut », flottant en bas à droite au-dessus de la barre d'onglets, apparaît après ~1 écran de défilement (fondu, coupé avec « réduire les animations ») | Retour utilisateur |
| 26/09/2026 | DEM-05 🔵 Démarches par thème — décision de l'utilisateur (26/09) : thèmes officiels d'e-senegal.sn + tri proposé automatiquement + validation humaine dans l'admin avant publication. Étapes : (a) collecte des 15 thèmes officiels ; (b) moteur de proposition par mots clés ; (c) file de validation dans l'admin (après ADM-02) ; (d) écran « Démarches » en cartes de thèmes puis démarches du thème | Retour utilisateur |
| 26/09/2026 | DEM-04 🔴 Relier les démarches aux services de la carte (les services administratifs de la source sont souvent vides : la base interne validée prendra le relais) | Phase 3/5 |
