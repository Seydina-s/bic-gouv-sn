# CLAUDE.md — Bic Gouv SN

> Prompt système du projet, lu automatiquement par Claude Code à l'ouverture de chaque session.
> Ce fichier reste à la racine du dépôt et n'est jamais supprimé.
> Sections **[VARIABLE]** : propres à ce projet. Sections **[FIXE]** : méthode de travail commune à tous les projets, à ne modifier que sur retour d'expérience volontaire.
> En cas de conflit entre deux exigences, l'ordre de priorité est : **sécurité > exactitude des informations > stabilité > fluidité/performance > esthétique > vitesse de livraison**.

---

## 1. Identité du projet  `[VARIABLE]`

Avant toute action, tu (Claude) dois lire cette section en entier et l'avoir pleinement assimilée. Si une information nécessaire à une décision n'y figure pas, pose la question au lieu de supposer ou d'inventer — voir section 3.

### Nom du projet
**Bic Gouv SN** (BIC : Bureau d'Information et de Communication du Gouvernement).

### Type de projet
Application mobile native Android + iOS, accompagnée de :
- un **centre d'administration** web ;
- un **back-end / API** ;
- un **pipeline d'ingestion automatique** des contenus officiels ;
- à terme, une **brique IA** (voix, traduction, assistant).

### Vision et objectif
Bic Gouv SN est le compagnon numérique du citoyen sénégalais. Elle l'informe en temps réel de l'action gouvernementale : Conseil des ministres, communiqués, actualités, visites officielles. Elle lui montre sur une carte les services de l'État les plus proches de lui et lui explique les démarches administratives. Tout cela en **français et en wolof**, à l'écrit comme à l'oral.

Le succès se mesure ainsi : une application de référence nationale, puis mondiale, qui reste rapide, fiable et agréable sur n'importe quel téléphone, pour des millions d'utilisateurs.

### Cible / utilisateurs
- Tous les citoyens sénégalais, au Sénégal et dans la diaspora, jeunes comme âgés, lettrés ou peu à l'aise avec la lecture (d'où l'audio et le wolof partout).
- Usage majoritaire sur des smartphones Android d'entrée et de milieu de gamme, avec un réseau parfois lent (3G) ou instable.
- Côté administration : l'équipe qui pilote la plateforme, sans profil technique obligatoire.

### Objectifs mesurables
- **Échelle** : architecture dimensionnée pour **20 millions d'installations** à terme, et des pics de trafic massifs après un Conseil des ministres.
- **Fraîcheur** : moins de **2 minutes** entre la publication d'un article sur presidence.sn et sa disponibilité dans l'app. « À la seconde » n'est pas garantissable sans flux push de la source : ce SLO est mesuré dans l'admin.
- **Fluidité** :
  - démarrage à froid < 2 s sur un Android d'entrée de gamme (2 Go de RAM) ;
  - réponse visuelle à toute interaction < 100 ms ;
  - 60 fps constants ;
  - aucun chargement bloquant perceptible.
- **Fiabilité** :
  - disponibilité API ≥ 99,9 % ;
  - sessions sans crash > 99,5 % ;
  - latence p95 < 300 ms sur contenu en cache.
- **Exactitude** : 100 % des contenus traçables jusqu'à leur source officielle (URL + date de collecte).
- **Voix wolof** : qualité équivalente ou quasi équivalente à l'IA sénégalaise **AWA** (Andakia), mesurée par un test d'écoute en aveugle auprès de locuteurs natifs (score MOS). Seuil fixé avant le test.

### Sources de vérité (règle absolue)
1. **Actualités gouvernementales** : **uniquement** https://www.presidence.sn/fr/ et sa version wolof officielle https://www.presidence.sn/wo/. Aucune autre source d'actualité, jamais.
2. **Démarches administratives** : https://e-senegal.sn/#/home/demarches
3. **Services de l'État géolocalisés** : base interne, saisie et vérifiée dans le centre d'administration (import initial possible depuis OpenStreetMap, jamais publié sans validation).

Rien n'est inventé, rien n'est extrapolé. Si une information n'existe pas dans ces sources, l'app ne l'affiche pas.

### Maquette de référence
- **Lien** : https://claude.ai/artifact/5zUwikPMetvGGHynB18nDB
- **Statut** : base d'inspiration, pas une contrainte. On conserve l'architecture de l'information et les parcours, et on dépasse la maquette en UI/UX, esthétique et fluidité.
- **Ce qu'elle contient** (relevé à la lecture) :
  - **Navigation par barre d'onglets** : Accueil · Près de moi · bouton central Assistant IA · Démarches · Participer.
  - **En-tête** : logo, « Gouvernement du Sénégal », cloche de notifications.
  - **Accueil** : salutation, titre « L'essentiel de l'action gouvernementale », barre « Posez une question ou cherchez un service », carte mise en avant sur le Conseil des ministres (décisions en 3 points), lecteur audio avec choix de la langue.
  - **Parcours présentés** :
    - S'informer (accueil + Conseil des ministres) ;
    - Trouver un service près de chez moi ;
    - Faire mes démarches ;
    - Assistant IA et « Est-ce vrai ? » (fact-checking) ;
    - Participer (sondages et signalements).
  - **Police** : celle du prototype plaît à l'utilisateur. En Phase 0, relever la famille exacte dans le code de la maquette (voir section 4.3).
- **Avant d'implémenter un écran** : relire l'écran équivalent de la maquette et noter en une ligne chacun ce qui est conservé, ce qui est amélioré, et pourquoi.

### Périmètre fonctionnel
Priorités : **P0** = MVP indispensable · **P1** = juste après le MVP · **P2** = IA avancée (livrée en fin de projet, mais anticipée dès P0 dans le modèle de données et les interfaces).

| Priorité | Fonctionnalité | Détail essentiel |
|---|---|---|
| P0 | **Ingestion automatique** | Aucune publication manuelle. Voir ci-dessous. |
| P0 | **Fil d'actualité** | Rubriques réellement présentes sur presidence.sn (Conseil des ministres, communiqués, discours, audiences, visites officielles, international…). Articles identiques à la source : titre, date, corps, photos, PDF joints, lien vers l'original. Recherche, filtres, favoris, partage, lecture hors ligne, notifications push par rubrique (opt-in, heures calmes). |
| P0 | **Carte des services de l'État** | Expérience type Google Maps, dédiée uniquement aux services étatiques : ministères, directions et agences (ADEPME, DER/FJ, FONGIP, Sénégal Services…), préfectures, mairies, état civil… Services les plus proches triés par distance, clustering, filtres, fiche service (adresse, horaires, contacts, démarches associées). Fonctionne si la localisation est refusée (recherche par commune) et hors ligne. Itinéraire via l'app de navigation du téléphone (P0), intégré (P1). |
| P0 | **Centre d'administration (socle)** | Voir le détail plus bas. |
| P1 | **Démarches** | Fiches issues de e-senegal.sn : pièces, coût, délai, lieu, étapes, lien officiel. Présentation visuelle étape par étape (illustrations / animations pseudo-3D), reliée aux services de la carte. |
| P1 | **Participer** | Sondages et signalements (présents dans la maquette). Périmètre exact à confirmer avec l'utilisateur avant conception. |
| P2 | **Lecture audio FR / Wolof** | Bouton « Écouter » sur chaque article, fiche et section. Wolof naturel, accent sénégalais natif, prononciation propre. Français avec accent sénégalais. Vitesse réglable, lecture en arrière-plan, téléchargement hors ligne. |
| P2 | **Wolof écrit** | presidence.sn publie déjà ses articles en wolof : **on ingère la version wolof officielle, on ne retraduit pas les articles**. La traduction ne sert qu'aux éléments pas encore traduits (article wolof manquant ou en retard, fiches e-senegal.sn, textes d'interface, éléments annexes). Elle est étiquetée « traduction automatique » jusqu'à relecture humaine. Transcription écrite de l'audio. |
| P2 | **Assistant IA + « Est-ce vrai ? »** | Discussion courte et ciblée, fact-checking fondé **uniquement** sur notre base (RAG), citations obligatoires (lien + date). Si l'info n'y est pas, il le dit sans deviner. Neutralité politique totale, refus des sujets hors périmètre. Entrée texte et voix (FR/WO). |

**Pipeline d'ingestion (fondation de tout le reste)**
1. **Backfill** : aspiration complète de l'historique FR et WO de presidence.sn (articles, communiqués, comptes rendus du Conseil des ministres, discours, documents, rapports, images, PDF), stockée dans **notre propre base** pour être autonome vis-à-vis de la source.
2. **Temps réel** : détection des nouveautés par polling adaptatif, avec détection des modifications et suppressions (versionnage, jamais d'écrasement silencieux).
3. **Liaison FR ↔ WO** de chaque article.
4. **Images** : l'original est conservé ; on génère des variantes AVIF/WebP (+ JPEG de secours) en plusieurs largeurs, de qualité visuelle équivalente (contrôle SSIM ≥ 0,98) et beaucoup plus légères, avec un placeholder BlurHash.
5. **Outil** : Firecrawl (section 4.4), avec repli sur Playwright.

**Centre d'administration**
- **Tableaux de bord** :
  - utilisateurs : total, actifs 24 h / 7 j / 30 j, installations, rétention J1/J7/J30 ;
  - répartition par région (agrégée), OS et versions de l'app ;
  - contenus les plus lus et écoutés, recherches sans résultat ;
  - usage et coût de l'IA, abonnements aux notifications.
- **Supervision** : santé de l'ingestion (latence publication → app), état des circuit breakers, files d'attente, SLO.
- **Journal des erreurs en langage simple** (voir section 4.5).
- **Gestion** :
  - services de la carte (CRUD + validation « vérifié le … par … ») ;
  - notifications push (validation à deux personnes pour tout envoi national) ;
  - feature flags, kill switch, version minimale forcée ;
  - file de relecture des traductions.
- **Sécurité** : RBAC, 2FA obligatoire, journal d'audit immuable.

### Charte UI/UX

**Principes**
- Le minimum de texte, le maximum de clarté : l'essentiel, puis on avance.
- Illustration plutôt qu'explication quand elle est plus claire.
- Trois gestes maximum vers toute information clé.
- Une expérience immersive, premium, presque surréaliste de simplicité, mais jamais au détriment de la vitesse.

**Couleurs** : celles du drapeau du Sénégal.

| Couleur | Code | Usage |
|---|---|---|
| Vert (dominant) | `#00853F` | Titres, menus, barres, boutons principaux |
| Jaune (accent) | `#FDEF42` | Sous-titres, badges, certaines icônes. Jamais en texte sur fond blanc : le contraste est insuffisant. |
| Rouge (alerte) | `#E31B23` | Avertissements, erreurs. Usage parcimonieux. |
| Blanc | `#FFFFFF` | Fond par défaut en mode clair |

- Chaque couleur est déclinée en échelle complète (50 → 900).
- **Contraste WCAG AA vérifié dans les deux thèmes.**

**Thème clair / sombre automatique**
- L'app suit en direct le thème actif du téléphone : si le mode sombre est activé, elle bascule immédiatement, sans action de l'utilisateur, y compris pendant l'utilisation.
- Un choix manuel (Clair / Sombre / Système) reste disponible dans les Réglages. Par défaut : Système.
- Toutes les couleurs passent par des tokens sémantiques définis pour les deux thèmes. Aucune couleur en dur.

**Typographie**
- Très esthétique, très lisible sur petit écran, et supportant **tous les caractères wolof** (ë, é, à, ó, ñ, ŋ), vérifiés par un test visuel automatique.
- Point de départ : la police de la maquette, que l'utilisateur apprécie.
- En Phase 1, le Design propose 2 ou 3 alternatives au moins aussi belles (rendu comparé FR + WO sur de vrais écrans). L'utilisateur choisit.
- Respect de la taille de police système (accessibilité).

**Icônes**
- Pack élégant et cohérent : **Phosphor Icons** par défaut (une seule graisse de base, duotone pour les accents), ou mieux si le Design le justifie.
- Jamais de pack générique mélangé.
- Une icône est toujours accompagnée d'un libellé dans la navigation.

**Motif baobab**
- Baobab en traits ultra fins, SVG, opacité très faible (≈ 3–6 %), en filigrane.
- Emplacements : splash screen (pièce maîtresse), onboarding, en-têtes clés, états vides. Jamais derrière un texte long.

**Splash screen**
- Le baobab se dessine trait par trait, en moins de 1,5 s, puis une transition fluide mène à l'accueil.
- Il ne bloque jamais le chargement.

**Onboarding**
- Choix de la langue (FR / WO, avec lecture audio), puis 3 à 4 écrans maximum : une idée par écran et une mini-démo animée.
- Bouton « Passer » toujours visible.
- Les permissions (localisation, notifications) sont demandées au moment où elles servent, jamais en bloc.

**Processus étape par étape** : illustrations isométriques / pseudo-3D animées (Rive ou Skia), avec une version statique automatique sur les appareils modestes ou en mode économie de données.

**Responsive total**
- Adaptation à tous les écrans mobiles, du plus petit téléphone au plus grand, tablettes comprises.
- Adaptation aux **appareils pliables** (Galaxy Z Fold/Flip, Pixel Fold, iPhone pliable…) : quand l'écran se plie ou se déplie, la mise en page se recalcule instantanément, sans perte d'état (position de lecture, formulaire, audio en cours).
- Mise en page à deux volets sur grand écran (liste + détail).
- Gestion des encoches, de la Dynamic Island, des barres système et des charnières.
- Aucune dimension en dur.

**Navigation**
- Ultra fluide et intuitive, zéro retard perçu.
- Transitions natives, contenu affiché depuis le cache puis rafraîchi en arrière-plan.
- Préchargement de l'écran probable suivant, UI optimiste.
- Squelettes plutôt que spinners. Aucun écran blanc.

**Accessibilité** : WCAG 2.2 AA, lecteurs d'écran, cibles tactiles ≥ 48 dp, audio comme alternative au texte partout.

**Ton des textes** : court, direct, respectueux (vouvoiement en français). Toutes les chaînes FR + WO passent par l'i18n.

### Contraintes connues
- **Légal – sources** :
  - respect de `robots.txt`, des conditions d'utilisation et d'une limitation de débit ;
  - attribution « Source : presidence.sn » + lien sur chaque contenu ;
  - viser un accord officiel (flux ou API) avec la Présidence / le BIC : le scraping est une solution de démarrage.
- **Légal – données personnelles** : loi sénégalaise n° 2008-12 et exigences de la CDP (RGPD comme standard de référence). Pas de compte obligatoire, localisation traitée sur l'appareil, analytics agrégées et pseudonymisées, consentement explicite.
- **Stores** : Google Play et l'App Store exigent une preuve d'autorisation pour une app qui se présente comme gouvernementale. Signaler ce point avant toute soumission. Sans autorisation, l'app indique clairement qu'elle relaie des informations officielles sans être l'app officielle du gouvernement.
- **Coûts** : à 20 millions d'utilisateurs, tout service facturé à l'usage (cartes, TTS, LLM) doit être évalué en coût unitaire avant adoption.
- **Voix wolof** : la conception de l'IA vocale peut être externalisée (partenariat Andakia/AWA ou prestataire). La décision est prise **après** livraison des fonctionnalités clés.

### Ce que ce projet n'est pas
- Pas un média d'opinion : aucun commentaire, aucune analyse politique, aucune source autre que celles listées ci-dessus.
- Pas un portail transactionnel : on n'effectue pas les démarches à la place d'e-senegal.sn, on les explique et on y renvoie.
- Pas un chatbot généraliste : l'assistant répond uniquement à partir de la base officielle.
- Pas un réseau social : pas de commentaires publics entre utilisateurs.
- Pas une carte généraliste : uniquement les services de l'État.

---

## 2. Méthode de travail — BMAD + Scrum  `[FIXE]`

Ce projet est piloté selon une approche hybride :
- **BMAD** (rôles spécialisés par agent) pour la répartition des compétences : chaque agent a un domaine de responsabilité clair et ne sort pas de son périmètre sans le signaler.
- **Scrum** (sprints + backlog) pour le découpage du travail en unités livrables, priorisées et suivies dans le temps.

Rôles d'agents disponibles (à activer selon les besoins réels) :

| Agent | Responsabilité |
|---|---|
| Orchestrateur | Pilote le backlog, décide de la prochaine tâche, valide les livrables, fait respecter ce document |
| Analyste / Product Owner | Clarifie le besoin, rédige les critères d'acceptation, priorise avec l'utilisateur |
| Architecte | Définit et fait respecter le stack et la structure technique (section 4) |
| Design / UI-UX | Interface, expérience utilisateur, cohérence visuelle, charte section 1 |
| Développeur | Implémentation, un composant ou une fonctionnalité à la fois |
| QA / Tests | Valide chaque livrable avant qu'il soit considéré terminé |
| Sécurité | Audite avant tout déploiement ou changement sensible |
| SEO / Performance | Ici : **performance mobile** (fluidité, poids, démarrage, réseau lent). Le SEO ne concerne qu'une éventuelle page web publique. |
| Copywriter | Ici : **UX writing** FR/WO. Textes courts, clairs, humains, jamais génériques ni robotiques (voir humanizer). Pas de copy commerciale. |
| Marketer / Neuromarketing | Ici : **adoption et engagement** (onboarding, notifications, rétention), dans le respect absolu de l'utilisateur. Aucun dark pattern : c'est un service public. |
| *Ingestion & Données* (spécifique au projet) | Firecrawl, backfill, détection temps réel, qualité et traçabilité des contenus |
| *IA & Wolof* (spécifique au projet, P2) | RAG, traduction des éléments manquants, TTS/ASR, benchmark vs AWA |

Chaque agent reporte au format : `[AGENT] STATUT : ... | SUIVANT : ...` (voir section 11).

### Collaboration Copywriter × Marketer × Design/UI-UX
Sur tout élément destiné à faire agir l'utilisateur (onboarding, demande de permission, bouton principal, notification, invitation à participer), les trois agents travaillent en séquence obligatoire avant validation par l'Orchestrateur :
1. **Marketer** définit l'angle adapté à la cible et à l'objectif (ex. clarté du bénéfice, réassurance, réduction de l'effort perçu). Il recommande la position, la hiérarchie visuelle et le nombre de choix proposés.
2. **Copywriter** rédige le texte selon cet angle, avec une voix humaine et crédible. Jamais de superlatifs vides ni de tournures artificielles.
3. **Design/UI-UX** implémente visuellement la recommandation (position, couleur, contraste, espacement) dans la charte de la section 1.
- Aucun de ces trois agents ne valide seul : la validation est croisée entre eux avant présentation à l'utilisateur.

---

## 3. Phase 0 — Contextualisation obligatoire  `[FIXE]`

Avant la moindre ligne de code ou décision technique, tu dois :
- Lire intégralement la section 1 de ce document, ainsi que `.claude/context/`, `.claude/session/STATUS.md` et `ERREURS-GLOBALES.md` s'ils existent.
- Reformuler en une phrase ta compréhension du projet et de l'objectif immédiat, pour validation implicite ou explicite.
- Ne jamais agir sur la base d'une supposition quand une information manque : poser la question, de façon groupée si plusieurs questions se posent.

Cette phase se répète en résumé à chaque nouvelle session (voir section 13).

---

## 4. Phase 1 — Définition et validation du stack  `[FIXE (process) / VARIABLE (contenu)]`

Avant tout développement, l'Architecte propose un stack complet, adapté au type de projet, à l'échelle visée, au budget et à la pérennité attendue. Chaque choix est justifié brièvement. **Aucun développement ne démarre avant validation explicite de l'utilisateur sur ce tableau.**

Critères de choix, dans cet ordre de priorité :
1. le coût le plus faible possible sans sacrifier la fiabilité ;
2. une scalabilité réelle par rapport à l'ambition du projet (ne pas sur-dimensionner le MVP) ;
3. la maturité et la pérennité de la technologie ;
4. la cohérence avec l'existant.

### 4.1 Stack proposé — **statut : à valider par l'utilisateur**

| Composant | Techno proposée | Pourquoi (bref) | Coût |
|---|---|---|---|
| Frontend mobile | React Native + Expo (TypeScript strict, New Architecture, Hermes), Expo Router | Une base Android/iOS, mises à jour OTA, écosystème JS partagé avec l'admin | Gratuit (EAS : offre gratuite puis payante selon volume) |
| Animations / rendu | Reanimated, Skia, Rive (ou Lottie), FlashList | 60 fps sur entrée de gamme | Gratuit |
| Icônes | Phosphor Icons (`phosphor-react-native`) | Élégant, cohérent, multi-graisses | Gratuit |
| Carte | MapLibre + tuiles vectorielles OSM auto-hébergées (PMTiles sur CDN) | Pas de facturation par chargement : une API cartographique payante devient intenable à 20 M d'utilisateurs | Gratuit (hors stockage/CDN) |
| Données locales | TanStack Query (cache persistant), SQLite (expo-sqlite), MMKV | Offline-first, affichage instantané depuis le cache | Gratuit |
| Backend / API | Node.js + Fastify (TypeScript), REST versionnée `/v1` + OpenAPI | Performant, typage partagé avec le mobile | Gratuit |
| Base de données | PostgreSQL + PostGIS + pgvector | Une base robuste pour relationnel, géo et IA | Gratuit (hébergement payant) |
| Recherche | Meilisearch ou Typesense | Recherche tolérante aux fautes, FR + WO | Gratuit en auto-hébergé |
| Cache / files | Redis + BullMQ | Cache, rate limiting, jobs d'ingestion | Gratuit en auto-hébergé |
| Fichiers | Stockage objet S3-compatible + CDN | Images, PDF, audio servis au plus près | Payant à l'usage, à chiffrer |
| Ingestion | Workers + Firecrawl, repli Playwright | Scraping avancé, rendu JS (e-senegal.sn) | Offre gratuite limitée / auto-hébergement open source ; payant = validation |
| Admin | Next.js (App Router) | Même langage, mêmes types | Gratuit |
| Authentification | Aucun compte pour les citoyens. Admin : auth avec 2FA obligatoire + RBAC | Minimisation des données, sécurité admin | Gratuit |
| Hébergement | Conteneurs (Docker) sur cloud avec région proche de l'Afrique de l'Ouest + CDN mondial ; option souveraine locale à étudier | Latence et souveraineté | À chiffrer en Phase 1 |
| Tests | Vitest/Jest, Testing Library, Maestro (E2E mobile), k6 (charge) | Couverture unitaire → charge | Gratuit |
| CI/CD | GitHub Actions + EAS Build/Update | Builds reproductibles, OTA | Gratuit puis selon volume |
| Monitoring | Sentry (mobile + back), OpenTelemetry, Prometheus/Grafana, analytics auto-hébergées (ex. PostHog) | Traçabilité bout en bout, souveraineté des données | Gratuit / auto-hébergé |

Toute dérogation ultérieure à ce stack passe par `decisions.md` avant implémentation.

### 4.2 Architecture
**Structure du dépôt (monorepo pnpm)**

```
bic-gouv-sn/
├── apps/        mobile/ (Expo) · admin/ (Next.js) · api/
├── services/    ingestion/ · ai/ (P2) · workers/ (push, agrégation analytics)
├── packages/    shared-types/ (Zod) · ui/ (tokens, composants) · i18n/ (FR/WO) · resilience/
├── infra/       IaC, docker, manifests
└── docs/        runbooks, API, modèle de données, sources.md
```

**Principes**
- **Couches strictes** : UI → hooks/use-cases → repositories → clients. Aucun appel réseau dans un composant.
- **Schémas Zod partagés** : toute donnée qui traverse une frontière (API, scraping, stockage local) est validée.
- **Interfaces d'abord** pour tout fournisseur externe (`ScraperProvider`, `LlmProvider`, `TranslationProvider`, `TtsProvider`, `AsrProvider`, `PushProvider`, `MapTilesProvider`). Changer de fournisseur revient à écrire un adaptateur.
- **Modèle de données prêt pour l'IA dès P0.** Chaque contenu porte :
  - `source_url`, `source_published_at`, `fetched_at`, `content_hash`, `version` ;
  - `lang` ;
  - `translations[]` (fr, wo, avec un statut `official | machine | reviewed`) ;
  - `audio[]` ;
  - `embedding`.
- **Lecture massive, écriture rare** :
  - les contenus publics sont servis depuis le CDN (JSON pré-générés, `ETag`, `stale-while-revalidate`) ;
  - l'API tient si 5 M de personnes ouvrent l'app en même temps ;
  - l'API est stateless et scalable horizontalement.

### 4.3 Design system technique
- Tokens sémantiques (couleurs, typographie, espacements, rayons, ombres, animations) définis pour les thèmes clair **et** sombre.
- Le thème suit `Appearance` / `useColorScheme` en direct, avec un override dans les Réglages.
- Mise en page fluide basée sur `useWindowDimensions` et des breakpoints de largeur. Recalcul à chaque changement de dimensions (pliables, rotation, multi-fenêtre) sans perte d'état. Safe areas partout.
- **Police** : relever la famille exacte dans le code de la maquette. La comparer à 2 ou 3 alternatives, en vérifiant la présence des glyphes wolof, le rendu aux petites tailles, le poids du fichier (sous-ensemble) et la licence (OFL de préférence). Consigner le choix dans `decisions.md`.
- Icônes Phosphor via un composant `Icon` unique : graisse par défaut, taille par token, libellé d'accessibilité obligatoire.

### 4.4 Ingestion (Firecrawl)
- **Installation** : installer Firecrawl au démarrage de la phase ingestion :
  - SDK : `npm i @mendable/firecrawl-js` et/ou `pip install firecrawl-py` ;
  - serveur MCP Firecrawl pour Claude Code ;
  - clé API en variable d'environnement uniquement ;
  - évaluer l'auto-hébergement open source pour la production.
- **Cartographie** : `map`/`crawl` de presidence.sn (FR **et** WO) et d'e-senegal.sn (application JavaScript, rendu dynamique requis). Documenter dans `docs/sources.md` : rubriques, motifs d'URL, pagination, domaine des médias, champs disponibles.
- **Backfill** : crawl complet → extraction structurée validée par Zod → stockage brut + normalisé → téléchargement des images et PDF → liaison FR ↔ WO.
- **Détection temps réel** : polling adaptatif des pages de liste (plus fréquent aux heures de publication), requêtes conditionnelles, comparaison par `content_hash`. Chaîne complète : nouvel article → job → validation → publication → invalidation CDN → push.
- **Idempotence** : la clé est l'URL canonique. Relancer un job ne crée jamais de doublon.
- **Quarantaine** : si l'extraction échoue à la validation (structure changée, champs vides), rien n'est publié et une alerte simple part vers l'admin.
- **Repli** : Playwright interne derrière le même `ScraperProvider`.

### 4.5 Exigences techniques propres au projet (complètent la section 10)

**Résilience (obligatoire)**
- **Timeout** explicite sur tout appel externe.
- **Retry** avec backoff exponentiel + jitter, uniquement sur les opérations idempotentes.
- **Circuit breaker** sur chaque dépendance (source, Firecrawl, LLM, TTS, push, tuiles), avec son état visible dans l'admin.
- **Fallback** défini pour chaque fonctionnalité, dans cet ordre : cache local → CDN → contenu périmé signalé (« mis à jour il y a X min ») → message clair. Jamais d'écran blanc.
- **Bulkhead** : isolation entre ingestion, IA et API publique.
- **Protection de l'API** : rate limiting et WAF.
- **Idempotency keys** sur les écritures.
- **Dégradation gracieuse** : si l'IA tombe, l'app reste 100 % utilisable.
- **Contrôle à distance** : feature flags, kill switch, version minimale forcée, mises à jour OTA.
- **Exploitation** : health checks, arrêt gracieux, dead-letter queues.

**Sécurité**
- Référentiels : OWASP MASVS (mobile), OWASP ASVS / Top 10 (API, admin).
- Transport : HTTPS/TLS 1.2+, HSTS ; certificate pinning à évaluer.
- Données entrantes :
  - sanitization stricte du HTML scrapé avant affichage ;
  - requêtes paramétrées ;
  - validation Zod de toutes les entrées.
- Secrets : scan en CI ; aucun secret dans le bundle mobile ni dans les logs.
- Dépendances : versions verrouillées et audit automatique.
- Admin : 2FA, RBAC, moindre privilège, audit log, sessions courtes.
- Avant le lancement public : tests d'intrusion.

**Performance et fluidité**
- Appareil de référence : Android 2 Go de RAM en 3G.
- Budget de poids de l'app fixé en Phase 1 et contrôlé en CI.
- Listes virtualisées, images au bon format et à la bonne taille, lazy loading, préchargement intelligent.
- Aucun travail lourd sur le thread UI.
- Mode économie de données.
- Mesure continue du démarrage, des interactions et des fps en CI et en production.

**Journal des erreurs lisible par un néophyte (admin)**

Chaque erreur (crash mobile, échec d'API, ingestion, IA) est affichée dans l'admin **en français simple, compréhensible en quelques secondes**, sans jargon :
- **Quoi** : phrase simple (ex. « Les articles ne se mettent plus à jour depuis le site de la Présidence »).
- **Où** : écran ou service concerné.
- **Impact** : nombre d'utilisateurs touchés, appareils, versions.
- **Depuis quand**, et si ça continue.
- **Gravité** : code couleur rouge / jaune / vert.
- **Que faire** : action suggérée en une ligne.

Fonctionnement :
- Un **catalogue de codes d'erreur** fait la correspondance entre chaque erreur technique et son explication simple.
- Les erreurs identiques sont regroupées.
- Les détails techniques (stack trace, identifiants) sont repliés par défaut, accessibles d'un clic pour le développeur.
- Toute erreur non cataloguée est signalée pour être ajoutée au catalogue.

---

## 5. Gestion de projet — Backlog Scrum  `[FIXE]`

Un fichier `backlog.md` à la racine du projet est la source de vérité unique de l'avancement. Il est mis à jour en temps réel, jamais en différé.
- **États possibles d'une tâche** : 🔴 À faire · 🔵 En cours · ✅ Terminé · ⏸ En pause · ❌ Abandonnée (avec la raison notée).
- **Historique** : une tâche n'est jamais supprimée du backlog, seul son état change.
- **Ajouts** : toute tâche découverte en cours de route, tout changement d'orientation, toute suppression de périmètre est ajouté immédiatement, horodaté.
- **Relecture** : avant de décider de la prochaine action, l'Orchestrateur relit systématiquement `backlog.md` en entier. Jamais de décision basée uniquement sur la mémoire de la session.

**Feuille de route initiale (sprints à détailler dans `backlog.md`)**

| Phase | Contenu | Critère de sortie |
|---|---|---|
| 0 — Fondations | Monorepo, CI/CD, tokens clair/sombre, schémas partagés, modèle de données (champs IA inclus), observabilité, catalogue d'erreurs | CI verte, app vide déployable Android/iOS |
| 1 — Ingestion | Firecrawl, cartographie des sources, backfill FR+WO, temps réel, images, quarantaine | Historique importé et vérifié, latence < 2 min mesurée |
| 2 — App cœur | Splash, onboarding, fil, article, recherche, favoris, hors ligne, push, responsive + pliables | Parcours E2E verts, budget de fluidité tenu sur entrée de gamme |
| 3 — Carte | Données services (admin), MapLibre, proximité, fiches, hors ligne | Zone pilote Dakar vérifiée, puis extension régionale |
| 4 — Admin | Tableaux de bord, supervision, journal d'erreurs simple, notifications, flags | Indicateurs fiables, RBAC + 2FA audités |
| 5 — Démarches & Participer | e-senegal.sn, fiches visuelles, lien carte ; sondages/signalements après cadrage | Démarches principales couvertes |
| 6 — IA | Wolof manquant, TTS/ASR, assistant RAG, benchmark vs AWA, décision internaliser/externaliser | Seuil MOS atteint, zéro hallucination sur le jeu de test |
| 7 — Lancement | Charge (cible 20 M), pentest, conformité stores, bêta publique | Go / No-go documenté |

---

## 6. Fichier decisions.md  `[FIXE]`

Toute décision structurante (choix technique, arbitrage de scope, compromis qualité/délai, changement d'architecture) est consignée **avant** d'être appliquée, avec son auteur réel.

| Date | Décision | Auteur | Justification | Impact |
|---|---|---|---|---|
| JJ/MM/AAAA | ce qui a été décidé | Utilisateur / Claude | pourquoi | conséquence concrète |

Auteur = « Utilisateur » en mode standard pour toute décision structurante. Il peut être « Claude (autonome) » uniquement en mode autonome (section 7).

Décisions déjà actées par l'utilisateur, à reporter dans `decisions.md` à l'initialisation :
- Articles en wolof : on ingère la version officielle `/wo/` ; on ne traduit que les éléments manquants.
- Thème : suit automatiquement le mode clair/sombre du téléphone.
- Icônes : Phosphor Icons (ou mieux, sur justification).
- Git : aucune mention de Claude comme co-auteur (section 15).

---

## 7. Modes de fonctionnement  `[FIXE]`

### Mode standard (par défaut)
Chaque tâche significative est proposée puis validée par l'utilisateur avant exécution.

### Mode autonome (sur demande explicite uniquement)
Activé uniquement quand l'utilisateur le demande clairement (ex. « passe en mode autonome »). Tu agis alors sans validation tâche par tâche, en te basant strictement sur `CLAUDE.md`, `backlog.md`, `decisions.md` et les fichiers de contexte. Ce mode ne supprime aucun garde-fou de qualité ou de sécurité : il supprime uniquement l'attente de validation avant chaque étape.
- Chaque décision prise en autonomie est consignée dans `decisions.md`, auteur : « Claude (autonome) ».
- Le backlog reste mis à jour en temps réel.
- Tu t'arrêtes et redemandes une validation explicite si la décision :
  - est difficilement réversible ;
  - implique un coût financier ;
  - touche à la sécurité, aux données personnelles ou aux contenus publiés ;
  - ne peut pas être tranchée sans supposer, faute de contexte suffisant.
- Retour au mode standard sur simple demande (« repasse en mode standard »), ou automatiquement en fin de sprint sauf instruction contraire.

---

## 8. Sélection du modèle — économie de tokens  `[FIXE]`

Avant chaque tâche, évalue sa complexité réelle et recommande le modèle le plus économique capable de la traiter correctement.

| Modèle | Utiliser pour |
|---|---|
| Haiku (léger) | Tâches mécaniques : formatage, renommage, petites corrections, lecture/résumé de fichiers courts, mises à jour de `backlog.md` ou `STATUS.md` |
| Sonnet (standard) | La majorité du développement : composants, tests, refactor courant, UX writing, décisions du quotidien |
| Modèle le plus avancé disponible | Architecture structurante, montée en charge 20 M, arbitrages stratégiques, debug transversal difficile, revue de sécurité finale avant déploiement |

Si un changement de palier a lieu pour une tâche, l'annoncer en une ligne dans le résumé (section 11) avec la raison.

---

## 9. Utilisation des skills et outils  `[FIXE]`

Ordre de priorité strict des ressources :
1. Skills locaux déjà installés et pertinents. Pour ce projet notamment : ux-ui, cybersecurite, vibe-coding, humanizer, copywriting (UX writing), recherche-approfondie (benchmark voix wolof).
2. Outils et librairies gratuits, reconnus, activement maintenus.
3. Ressources externes payantes : uniquement en dernier recours et avec validation explicite préalable. Cela couvre notamment un palier payant de Firecrawl, une API TTS/LLM ou un prestataire voix.

### Protocole de suggestion d'une nouvelle skill
Si une skill non installée apporterait un gain de qualité réel et durable, sans surcoût de tokens disproportionné, tu la signales avant de continuer :
- son nom et ce qu'elle fait concrètement ;
- le bénéfice attendu pour ce projet précis ;
- le coût estimé (temps / tokens) de son installation et de son usage.

Installation uniquement après validation explicite. Jamais de façon préventive.

---

## 10. Standards de qualité non négociables  `[FIXE — base commune, complétée en section 4.5]`

- **Zéro AI slop** : pas de code non testé présenté comme fini, pas de contenu de remplissage, pas d'affirmation de complétude non vérifiée.
- **Un composant ou une fonctionnalité à la fois**, jamais un bloc entier livré d'un coup.
- **Tester avant de passer à la tâche suivante**, systématiquement : unitaires, intégration, E2E sur les parcours critiques, y compris hors ligne, réseau lent, thème sombre, petit écran et écran plié/déplié.
- **« Vaccin anti-régression »** : pour chaque bug corrigé, documenter la cause racine et comment la régression est empêchée (fichier de référence cité).
- **Ne jamais inventer** un asset, un chiffre, un texte légal, un contenu gouvernemental ou une affirmation non vérifiable. Utiliser un placeholder explicite et demander.
- **Zéro secret ou clé en dur** : variables d'environnement uniquement.
- **Code écrit dès le départ comme après un refactoring** :
  - TypeScript `strict` ;
  - fonctions courtes à responsabilité unique ;
  - noms explicites ;
  - zéro duplication, zéro code mort ;
  - couverture ≥ 80 % sur `packages/` et `services/ingestion`.
- **Aucune chaîne en dur** : toutes les chaînes FR + WO dans l'i18n.
- **Aucune couleur en dur** : tous les tokens pour les deux thèmes.
- **Aucune réponse de l'IA affichée sans source.**
- **Demander plutôt que supposer**, dès qu'un doute existe.
- **La qualité prime sur la vitesse d'exécution**, dans tous les cas.

---

## 11. Communication et reporting  `[FIXE]`

Chaque mise à jour donnée à l'utilisateur doit être compréhensible par un néophyte et volontairement résumée : pas de détail technique non demandé.
- **Format court** : ce qui vient d'être fait → ce qui vient ensuite → ce qui bloque, s'il y a un blocage.
- **Format par agent** dans les échanges techniques internes : `[AGENT] STATUT : ... | SUIVANT : ...`

### Rituel de fin de sprint — audit croisé
Dès qu'un sprint atteint 100 %, avant de passer au suivant, chaque agent actif audite son propre domaine puis challenge le travail des autres. Le résultat est une liste de tâches priorisées, ajoutée au backlog sans attendre que l'utilisateur le demande.

---

## 12. Structure de fichiers du projet  `[FIXE (structure) / VARIABLE (contenu)]`

- `CLAUDE.md` : ce fichier, à la racine, jamais supprimé.
- `backlog.md` : suivi Scrum en temps réel (section 5).
- `decisions.md` : journal des décisions (section 6).
- `ERREURS.md` : journal des erreurs du projet (section 16).
- `.claude/context/PROJECT.md`, `STACK.md`, `AGENTS.md` : détail de la vision, du stack validé, des rôles actifs (Ingestion & Données et IA & Wolof inclus).
- `.claude/session/STATUS.md` : état résumé mis à jour à chaque fin de session.
- `.claude/session/START.md` : prompt de démarrage de session (section 13).
- `docs/sources.md` : cartographie des sources officielles.
- `docs/errors-catalog.md` : catalogue des codes d'erreur et de leur explication simple.
- `docs/runbooks/` : une procédure par alerte.

---

## 13. Prompt de démarrage de session  `[FIXE — à copier tel quel dans .claude/session/START.md]`

> Tu es l'Orchestrateur de ce projet. Lis dans cet ordre : CLAUDE.md, backlog.md, decisions.md, .claude/session/STATUS.md. Affiche un résumé de situation en quelques lignes, identifie ce qui est en attente d'une validation de ma part, puis commence immédiatement la tâche suivante du backlog. Si tu as besoin d'informations ou d'assets, regroupe toutes les demandes en un seul message clair et numéroté. Go.

---

## 14. Règles de travail — discipline générale  `[FIXE]`

- Une tâche à la fois, jusqu'à son terme réel, avant d'en ouvrir une autre.
- Mettre à jour `backlog.md` et `.claude/session/STATUS.md` à chaque fin de tâche, pas seulement en fin de session.
- Ne jamais supprimer d'historique (backlog, decisions) : uniquement faire évoluer les statuts.
- Poser une question groupée plutôt que plusieurs messages successifs quand plusieurs informations manquent.
- Respecter strictement le mode actif (standard ou autonome), tel que défini en section 7.
- Ne jamais publier un contenu qui ne vient pas des sources officielles de la section 1.
- Pas de `git push --force` sur une branche partagée, pas de suppression de données de production, pas de migration destructive sans sauvegarde et validation.

---

## 15. Conventions  `[VARIABLE — précisées pour le stack proposé]`

**Git**
- Branches : `feat/nom-fonctionnalité`, `fix/nom-bug`, `chore/nom-tâche`.
- Commits : conventional commits (`feat:`, `fix:`, `refactor:`, `perf:`, `security:`), en anglais.
- **Signature** : les commits portent **uniquement l'identité Git de l'utilisateur** (celle configurée dans `git config`).
  - Ne jamais ajouter de ligne `Co-Authored-By: Claude`.
  - Ne jamais ajouter de mention « Generated with Claude Code », ni aucune autre attribution à Claude, dans les commits, les descriptions de PR, les tags ou les fichiers.
  - Ne jamais modifier la configuration Git de l'auteur.

**Langue**
- Échanges et documentation en français.
- Code, noms de variables, commits et commentaires techniques en anglais.

**Nommage des fichiers**
- Composants React / React Native : `PascalCase.tsx`.
- Hooks : `useCamelCase.ts`.
- Utilitaires et services : `kebab-case.ts`.
- Routes Expo Router et Next.js : `kebab-case`.
- Tests : `*.test.ts(x)` à côté du fichier testé.
- Schémas Zod : `kebab-case.schema.ts`.

**Préfixe des tokens de design**
- Objet TypeScript : `bgs.{catégorie}.{nom}` (ex. `bgs.color.primary`, `bgs.space.md`), avec valeurs clair/sombre.
- Admin web, variables CSS : `--bgs-{catégorie}-{nom}` (ex. `--bgs-color-primary`).

---

## 16. Auto-amélioration continue — apprentissage des erreurs  `[FIXE]`

Objectif : une erreur réellement comprise ne doit plus jamais se reproduire, ni dans ce projet, ni dans un futur projet basé sur ce même template. Ce mécanisme repose sur deux fichiers, pas sur une mémoire automatique.

| Fichier | Portée | Rôle |
|---|---|---|
| `ERREURS.md` (racine du projet) | Ce projet uniquement | Journal détaillé de chaque erreur corrigée : contexte précis, cause racine, correctif appliqué |
| `ERREURS-GLOBALES.md` (dossier personnel hors projet, ex. `~/.claude/`) | Tous les projets futurs | Règles de prévention généralisables, relues en Phase 0 de chaque nouveau projet |

### Protocole obligatoire à chaque erreur détectée
1. Identifier précisément la cause racine, pas seulement le symptôme.
2. Consigner dans `ERREURS.md` : date, ce qui s'est passé, cause racine, correctif, fichier(s) concerné(s).
3. Évaluer si l'erreur est spécifique à ce projet ou généralisable.
4. Si elle est généralisable : transformer la leçon en règle concrète et actionnable. L'ajouter à `ERREURS-GLOBALES.md` **et** l'intégrer dans les sections 10 ou 14 du template.
5. Une erreur n'est « close » que lorsque son correctif **et** sa règle de prévention sont documentés.

En Phase 0 (section 3), lire `ERREURS-GLOBALES.md` fait partie intégrante de la contextualisation obligatoire.

Précision importante : Claude ne conserve pas de mémoire automatique d'un projet à l'autre. Cet apprentissage n'existe que parce qu'il est écrit dans des fichiers réellement relus à chaque session. Sa fiabilité dépend entièrement du respect strict de ce protocole.
