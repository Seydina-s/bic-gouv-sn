# Cartographie des sources officielles

Relevé du 25/09/2026 (tâche VS-01). Environ 40 requêtes au total, espacées d'au moins 1 seconde, avec un User-Agent qui identifie le projet.

Depuis le 09/10/2026, la plateforme couvre **tout le Gouvernement** : Présidence, Primature et ministères (décision de l'utilisateur, voir `decisions.md`). La section « Gouvernement » ci-dessous recense les sites de la Primature et des ministères.

## Gouvernement : Primature et ministères (relevé du 09/10/2026)

### Méthode

- Liste des ministères : page officielle https://primature.sn/le-gouvernement (Premier ministre, 29 ministres dont 4 « ministres auprès »).
- Adresses : liens officiels, puis recherche web. L'annuaire de https://www.vie-publique.sn n'a servi que de piste : c'est une **plateforme indépendante** (rubrique « Financement & indépendance »), **pas une source**.
- Chaque site a été interrogé directement : réponse, outil de publication, flux RSS, date du dernier article, `robots.txt`. Une seule visite par page, User-Agent du projet.
- **Actif** = un article daté de moins de 3 mois au 09/10/2026.

### Règles communes

- Attribution « Source : <institution> » avec un lien vers la page d'origine, comme pour presidence.sn.
- Au plus 1 requête par seconde et par site ; `Crawl-delay` respecté quand il est indiqué (10 s pour Forces armées et Santé).
- Certificat TLS invalide : **le site n'est pas collecté**, jamais de contournement. On le revérifie chaque mois.
- Doublons : un contenu publié par la Présidence et une autre institution n'est gardé qu'une fois, **dans sa version de la Présidence** ; l'autre publication est notée comme source complémentaire.

### Primature : primature.sn

- Drupal. `robots.txt` autorise `/publications/actualites` (seuls `/admin/`, `/core/`… sont interdits).
- Liste : `https://primature.sn/publications/actualites?page=0` à `?page=41` (42 pages au 09/10/2026), du plus récent au plus ancien.
- Autres rubriques : `/publications/conseil-des-ministres`, `/le-gouvernement`, `/programmes-speciaux`.
- Pas de flux RSS (`/rss.xml` : 404). Collecte par lecture des pages de liste puis des articles.
- Doublon connu : le communiqué du Conseil des ministres du 30/09/2026 est sur presidence.sn **et** primature.sn → version Présidence gardée.
- Pas de version wolof.
- **Collecte** (GOV-03) : `pnpm --filter @bgs/ingestion backfill fr --source primature`. Suivi des nouveautés toutes les 15 minutes par la collecte automatique, à côté de la Présidence ; une panne du site de la Primature est signalée dans la console (code `INGESTION_OTHER_SOURCE_UNREACHABLE`) sans arrêter la Présidence. Le réglage `WATCHED_SOURCES` (ex. `presidence` ou `presidence,primature`) choisit les sites suivis ; sans lui, tous le sont, et la Présidence l'est toujours. Essai complet du 09/10/2026 dans un stockage à part : **374 articles** (juin 2021 → octobre 2026), aucune quarantaine, environ 7 minutes à une visite par seconde.
- **Date** : celle affichée sous le titre dans la liste (« 30 sep 2026 »), la seule que le site donne ; c'est techniquement la date de dernière révision de l'article. Une date illisible reste vide, jamais devinée.
- **Rubrique** : `actualites` (la rubrique du site) ; **identifiant** : l'adresse canonique de l'article.
- **Doublons avec la Présidence** (GOV-04), mesurés le 09/10/2026 sur les 374 articles : **94 doublons** (comptes rendus du Conseil des ministres, composition du Gouvernement, Master Plan), qui partagent tous au moins 74 % de leurs suites de trois mots avec l'article de la Présidence ; les articles distincts en partagent au plus 25 %. Règle : publication à 3 jours au plus, au moins 60 % de suites communes, et longueurs comparables (le texte court fait au moins la moitié de l'autre), ce qui écarte une courte note reprise dans un long communiqué (nomination de Sidiki Kaba, 07/03/2024).

### Ministères : sites actifs

| Ministère | Site | Accès aux articles | Dernier article vu |
|---|---|---|---|
| Justice | justice.sec.gouv.sn | WordPress, flux RSS | 09/10/2026 |
| Industrie et Commerce | industriecommerce.gouv.sn | WordPress, flux RSS (accueil « en maintenance », flux à jour) | 09/10/2026 |
| Pêches et Économie maritime | mpem.gouv.sn | WordPress (collecté depuis le 09/10) | 08/10/2026 |
| Intérieur | interieur.gouv.sn | pages HTML, pas de RSS, pas de `robots.txt` | 07/10/2026 |
| Enseignement supérieur, Recherche et Innovation | mesr.gouv.sn (articles sur mesrisenegal.sn) | flux RSS (30 articles) | 05/10/2026 |
| Énergie et Pétrole | energie-mines.gouv.sn | WordPress, flux RSS ; titre encore « Énergie, Pétrole et Mines » | 05/10/2026 |
| Emploi et Formation professionnelle | formation.gouv.sn | WordPress ; flux RSS arrêté en 12/2025, accueil à jour | 29/09/2026 |
| Hydraulique et Assainissement | mha.gouv.sn | WordPress, flux RSS | 25/09/2026 |
| Agriculture, Souveraineté alimentaire et Élevage | agriculture.gouv.sn | WordPress, flux RSS ; `robots.txt` : collecte autorisée, `ai-train=no` (nous n'entraînons aucun modèle) | 22/09/2026 |
| Infrastructures | ministeredesinfrastructures.sn | application JavaScript : plan du site avec dates (16 articles), rendu par navigateur automatique | 01/09/2026 |
| Santé et Hygiène publique | sante.gouv.sn | Drupal, `Crawl-delay: 10` | 15/08/2026 |
| Forces armées | forcesarmees.gouv.sn | Drupal, `Crawl-delay: 10` | 08/08/2026 |
| Télécommunications et Numérique | mctn.sn | application Angular, sans plan du site : navigateur automatique | à mesurer au rendu |
| Éducation nationale | education.sn | Next.js, articles dans la page | à mesurer (liste à jour) |

### Ministères collectés par WordPress (GOV-05, 09/10/2026)

Justice, Industrie et Commerce, Énergie et Pétrole, Hydraulique et Assainissement, Agriculture : lus par l'interface publique de leur site (`/wp-json/wp/v2/posts`, 20 articles par page). Elle donne dates exactes, texte complet, photo de couverture et tout l'historique.

- **Commande** : `pnpm --filter @bgs/ingestion backfill fr --source <justice|industrie-commerce|energie|hydraulique|agriculture>`, puis `covers fr --source …` pour les photos.
- **Suivi des nouveautés** : toutes les 30 minutes, à côté de la Présidence et de la Primature ; une panne d'un site n'arrête pas les autres.
- **Identifiant** : le numéro WordPress de l'article sur son site. **Rubrique** : `actualites`.
- **Nettoyage site par site**, tiré de vrais articles (`services/ingestion/src/sources/wordpress/fixtures/`) :
  - Justice : codes du constructeur Divi retirés ; ses vidéos YouTube (`[et_pb_video]`) gardées ;
  - Industrie et Commerce : blocs de recherche, de catégories et d'articles liés retirés ;
  - Énergie : titre et photo répétés, menu « Departments » et lien « Suivez-Nous » retirés ;
  - pour tous : liens vers des profils Facebook (codes de pistage) retirés, le texte gardé ; affiche seule gardée même si c'est aussi la couverture.
- **Contrôle de qualité commun à toutes les sources** : lettres décoratives (copiées de Facebook) ramenées en lettres ordinaires, accents recomposés. Un texte français abîmé à la source (lettres remplacées par « ? », ou sans aucun accent sur plus de 300 lettres) part en quarantaine. Mesure du 09/10 : les textes français publiés ont au moins 0,8 % de lettres accentuées, les textes abîmés 0 % ; aucun des 1 352 textes français déjà publiés n'est écarté.
- **Essai complet du 09/10/2026** (stockage à part) :

| Ministère | Articles gardés | Écartés | Période | Raison des écarts |
|---|---|---|---|---|
| Justice | 113 | 2 | 2020 → 2026 | vidéo MP4 hébergée par le site (format pas encore lu par l'app) |
| Industrie et Commerce | 10 | 27 | 2024 → 2026 | texte abîmé à la source (articles de 2024 et début 2025) |
| Énergie et Pétrole | 174 | 5 | 2023 → 2026 | pages sans contenu (fiches de directions) |
| Hydraulique et Assainissement | 303 | 7 | 2021 → 2026 | contenu vide à la source |
| Agriculture | 250 | 10 | 2016 → 2026 | vidéo MP4, contenu vide, image hors du site |

### Ministères ajoutés le 09/10/2026 au soir

| Ministère | Site | Lecture | Essai du 09/10 |
|---|---|---|---|
| Pêches et Économie maritime | mpem.gouv.sn | WordPress ; ses réponses commencent par des blocs de style du constructeur de pages, ignorés | 75 articles sur 75 |
| Emploi et Formation professionnelle | formation.gouv.sn | WordPress par l'adresse `/?rest_route=` (l'adresse `/wp-json/` du site renvoie une erreur 500) ; **dernier article le 10/12/2025** : historique repris, la collecte reprendra si le site publie de nouveau | 507 articles sur 508 |
| Intérieur et Sécurité publique | www.interieur.gouv.sn | site Nuxt et Strapi ouvert en août 2026 : la page des actualités porte la liste complète dans ses données (`__NUXT_DATA__`), chaque page d'article son texte en blocs structurés, ses communiqués signés (PDF), ses vidéos et sa galerie ; rubriques Communiqués et Discours reprises, Activités et Dossiers en « Actualités » | 55 articles sur 58 (3 dossiers sans texte) |

Règles ajoutées pour toutes les sources le 09/10 au soir :
- un communiqué fait d'un seul PDF officiel est publié (le document apparaît dans « Documents officiels ») ;
- un émoji copié de Facebook arrive comme une image de Facebook : l'émoji est gardé en texte, l'image n'est jamais chargée.

### Ministères ajoutés dans la nuit du 09 au 10/10/2026

| Ministère | Site | Lecture | Essai |
|---|---|---|---|
| Santé et Hygiène publique | www.sante.gouv.sn | Drupal 7 : rubrique `/Actualites` page par page (≈ 135 pages), 10 s entre deux visites (`Crawl-delay`) ; **la liste n'affiche aucune date** : les articles récents sont datés par le flux `/rss.xml` (10 derniers), l'historique reste sans date (jamais devinée) | 36 articles sur 36 (3 pages) |
| Forces armées | www.forcesarmees.gouv.sn | Drupal 7 : rubriques `/actualites`, `/communiques`, `/discours` (≈ 63 pages), date affichée dans la liste, 10 s entre deux visites | 36 articles sur 36 (3 pages) |
| Culture, Artisanat et Tourisme | mcat.gouv.sn | WordPress ; un bloc « autres articles » placé dans le texte est retiré (règle commune) | 140 articles sur 154 : 8 en anglais, 6 vides |

Règle ajoutée pour toutes les sources : un texte annoncé en français mais écrit en anglais est mis de côté avec ce motif (« text in English »), en attendant l'édition anglaise de la phase multilingue. Aucun des 1 352 textes français publiés n'est concerné.

### Ministères : sites à revoir (non collectés pour l'instant)

| Ministère | Site | Constat du 09/10/2026 |
|---|---|---|
| Économie, Plan et Coopération | economie.gouv.sn | dernier article 20/05/2026 ; Drupal, collectable dès qu'il publie de nouveau |
| Famille, Action sociale et Solidarités | femme.gouv.sn | dernier article 06/01/2026 |
| Finances et Budget | finances.gouv.sn | relance du 09/10 : le nom se résout (41.208.146.4) mais le serveur ne répond ni en https ni en http (panne ou filtrage) ; à retenter depuis le serveur d'IA |
| Budget | budget.sec.gouv.sn | site de la Direction générale du Budget : documents budgétaires (lois de finances, rapports d'exécution), **pas d'actualités** ; certificat incomplet (le maillon intermédiaire manque) |
| Fonction publique, Travail et Réforme du service public | fonctionpublique.gouv.sn | relance du 09/10 : répond ; SPIP, flux `spip.php?page=backend` (10 articles), dernier article le 08/06/2026, publication irrégulière ; titres écrits en caractères décoratifs Unicode (à ramener en lettres ordinaires, NFKC) ; `robots.txt` absent |
| Microfinance et Économie sociale et solidaire | microfinance-ess.gouv.sn | certificat TLS expiré |
| Transports terrestres et aériens | mittd.gouv.sn | certificat TLS ne correspondant pas au site |
| Urbanisme, Collectivités territoriales et Aménagement | urbanisme.gouv.sn ; decentralisation.gouv.sn | dernier article 05/2024 ; certificat invalide |
| Intégration africaine et Affaires étrangères | diplomatie.gouv.sn | dernier article 03/2024 |
| Jeunesse et Sports | mjsc.gouv.sn | site de l'ancien ministère (Jeunesse, Sports et Culture), dernier article 06/2025 |
| Culture, Artisanat et Tourisme | culture.gouv.sn | site de l'ancien Secrétariat d'État, dernier article 06/2024 ; **nouveau site actif repéré le 09/10 : tourisme.gouv.sn** (et mcat.gouv.sn), à collecter |
| Environnement et Transition écologique | environnement.gouv.sn | site fermé par mot de passe (en construction) |
| Mines et Géologie | — | aucun site trouvé (minesgeologie.sec.gouv.sn n'existe plus) |
| Communication et Relations avec les Institutions | — | aucun site trouvé |
| Secrétariat général du Gouvernement | — | aucun site trouvé |

### Réseaux sociaux

Plusieurs ministères sans site actif publient sur Facebook ou X. Ces réseaux **ne sont pas collectés** :

- **Conditions d'utilisation** : la lecture automatique des pages Facebook est interdite sans l'accès « Page Public Content Access » de Meta (vérification d'entreprise et revue de l'application, rarement accordées) ; l'interface de lecture de X est payante.
- **Fiabilité** : ces services changent souvent leurs règles et coupent les accès sans préavis.
- **Traçabilité** : un message peut être modifié ou supprimé sans trace ; il n'a souvent ni titre ni texte complet.

YouTube fait exception : chaque chaîne officielle publie un flux RSS public et gratuit (`https://www.youtube.com/feeds/videos.xml?channel_id=…`), utilisable pour les vidéos d'une institution après vérification de la chaîne.

## presidence.sn : actualités

### Règles d'accès

- `https://www.presidence.sn/robots.txt` : `User-agent: *` / `Disallow:` (rien n'est interdit), plan du site `https://www.presidence.sn/sitemap.xml`.
- Aucune page de conditions d'utilisation ou de mentions légales n'a été trouvée dans le plan du site. **À confirmer avec le BIC**, qui porte le projet.
- Règles que nous appliquons quand même :
  - au plus 1 requête par seconde ;
  - un User-Agent qui identifie le projet ;
  - l'attribution « Source : presidence.sn » avec un lien vers la page d'origine ;
  - aucune republication hors de l'app.

### Architecture du site

- Front : Angular avec rendu serveur (`_ngcontent-*`), `<base href="/fr/">`. Les URL canoniques se terminent par `/` : sans le `/` final, le serveur répond par une redirection 301.
- Back-office : `https://bo-admin.presidence.sn`. Le front consomme une **API JSON publique**, qui est notre source de collecte : elle est plus fiable que l'analyse du HTML.

### API publique utilisée par le site officiel

La base est `https://bo-admin.presidence.sn/api`. La langue se choisit avec l'en-tête **`Accept-Language: fr | wo | en | ar`**.

| Appel | Rôle |
|---|---|
| `GET /front/article_categories` | Les 7 rubriques |
| `GET /front/articles?page={n}&q={texte}&categoryIds={ids}` | Liste paginée (8 par page, format de pagination Laravel : `data.total`, `data.last_page`, `data.data[]`) |
| `GET /front/articles/category?page={n}&category={id}` | Liste d'une rubrique |
| `GET /front/article/{slug}` | Détail : `data.article` (version dans une langue) + `data.article.article` (article de base) |

**Article de base** (commun à toutes les langues) : `id`, `reference`, `published`, `categorieId`, `date` (**`AAAA-MM-JJ`, sans heure**), `image`, `image_vedette`, `type` (`TEXTE`…), `video_url`, `document_1`, `document_2`, `created_at`, `updated_at`, `deleted_at`, `featured`.

**Version dans une langue** : `id`, `slug`, `titre`, `langage` (`FR`, `WO`…), `content` (HTML), **`articleId`** (identifiant de l'article de base), `weblink`, `created_at`, `updated_at`.

**Liaison FR ↔ WO** : les versions française et wolof d'un même article partagent le même `articleId`. Vérifié : l'article de base 1074 donne en FR « Le Président de la République reçoit une délégation de la Ligue des imams et prédicateurs… » et en WO « Njiitu Réew mi dalal na mbooloo mu bawoo ci Kurélug Imaam ak Waaraatekat yu Senegaa. ».

### Rubriques (`reference` → libellé)

`conseil-des-ministres` (Conseil des ministres) · `communiques` (Communiqués) · `international` (International) · `discours` (Discours) · `focus` (Focus) · `interviews` (Interviews & reportages) · `agenda` (Agenda).

### Volumes au 25/09/2026

| Langue | Articles | Plus récent | Plus ancien relevé |
|---|---|---|---|
| FR | 1 014 (127 pages) | 24/09/2026 | ≈ 2024 |
| WO | 318 (40 pages) | **01/10/2025** | — |

Le plan du site liste aussi des versions EN et AR, hors périmètre.

### Points d'attention pour la collecte

1. **Le wolof officiel s'est arrêté le 01/10/2025.** Près d'un an d'actualités n'existe qu'en français. Conformément à CLAUDE.md, ces articles recevront une traduction automatique étiquetée comme telle, jusqu'à relecture. À signaler au BIC : la reprise de la publication en wolof serait la meilleure solution.
2. **La date de publication n'a pas d'heure.** Le modèle doit stocker une date calendaire, sans inventer d'heure. `created_at` et `updated_at` sont des horodatages du back-office, utiles pour détecter les nouveautés et les modifications.
3. **Le HTML de `content` est hétérogène**, souvent collé depuis Facebook (classes `x…`, styles en ligne, largeurs d'image fixes). Il faut le nettoyer strictement avant affichage.
4. **Les URL d'images contiennent un double slash** (`//storage/…`). Il faut les normaliser, tout en conservant l'URL d'origine pour la traçabilité.
5. **La date s'affiche mal sur le site** (« 22 MONTHS.DECEMBER 2025 ») : c'est une clé de traduction non résolue dans le front. L'API, elle, renvoie la bonne valeur.
6. **Temps réel** : pour détecter les nouveautés, on interroge la page 1 (tri par date décroissante) et on compare `id` et `updated_at`.
7. **Pièces jointes PDF** (relevé du 28/09/2026) : `document_1` et `document_2` sont des **chemins relatifs** (`/storage/documents/<nom>.pdf`), servis par `https://bo-admin.presidence.sn`. Ils portent surtout le PDF officiel des communiqués du Conseil des ministres, et quelques dossiers de presse. 29 entrées de la liste en ont un (16 en français, 13 en wolof, souvent le même fichier pour les deux langues) ; `document_2` est toujours vide à cette date. Ces champs ne figurent que dans la liste et le détail, jamais dans le texte : la collecte les lit dans la liste. D'autres PDF sont liés dans le texte même (ex. brochure Vision Sénégal 2050) ; les deux sortes sont conservées chez nous.
8. **La liste ne suffit pas à détecter un retrait** (relevé du 28/09/2026, `pnpm --filter @bgs/ingestion withdrawn`) : 74 versions stockées (68 FR, 6 WO, surtout d'anciens articles) ne figurent plus dans la liste de l'API, mais leur page se lit toujours normalement ; **aucune n'est retirée**. Un article ne peut donc être tenu pour retiré qu'après une seconde lecture de sa page (erreur 404/410, ou `published` ≠ 1 / `deleted_at` renseigné).

### Piste à proposer au BIC

Puisque le projet est porté par le BIC, demander à l'équipe du back-office :

- de confirmer l'autorisation d'utiliser cette API ;
- si possible, d'ajouter une notification (webhook) à chaque publication, ce qui garantirait l'objectif de fraîcheur de moins de 2 minutes sans interroger le site en boucle.

## e-senegal.sn (démarches)

Relevé le 26/09/2026.

### Règles d'accès

- Pas de fichier `robots.txt` (l'adresse renvoie la page de l'application) : aucune règle explicite. On reste poli : 1 requête par seconde, client identifié (`BicGouvSN-ingestion`), et uniquement l'interface publique utilisée par le site lui-même.

### Architecture du site

- Application Angular à une seule page, routage par dièse (`#/`).
- Données servies par une interface **GraphQL** publique : `https://gateway.e-senegal.sn/citoyen/v1` (POST JSON `{ query, variables }`).
- Page publique d'une démarche (lien « source » affiché dans l'app), vérifiée au navigateur : `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/{slug}`.

### Requêtes utiles

- `fetchDemarches(queryFilter, demarcheFilter)` : liste paginée (100 par page) → `pagination { totalItems pageCount pageSize currentPage }` et `results { id titre slug resume delai cout icon form isAvailableOnTeledac teledacUrl categories { id title icon } variants { … } }`.
- `fetchDemarcheBySlug(slug)` : fiche complète → `titre resume description date_publication mot_cle cout delai corps qui_peut_faire_question qui_peut_faire_reponse documents_a_fournir online allowAppointment`, `service_administratifs { name sigle adresse ville region telephone email }` (lien avec la carte des services), `categories`, `textes` (textes officiels), `faqs { question reponse }`, `lien_utiles { name url }`, `formulaires`, `demarches` (démarches liées), `variants`.
- Autres : `SearchDemarches`, `FetchCategorys`, `FetchCategoriesByPurpose`, `FetchOnlineDemarches`, `FetchAdministrations`, `FetchFaqs`.

### Volumes au 26/09/2026

- **718 démarches** (8 pages de 100). Import complet ≈ 730 requêtes, ≈ 12 min à 1 requête/s.
- Coût (`cout`, en francs CFA) et délai (`delai`, en jours) parfois vides (`null`) : l'app n'affiche alors rien plutôt que d'inventer.

### Points d'attention pour la collecte

- Les champs longs (`description`, `corps`, `documents_a_fournir`…) sont du HTML : même assainissement strict que presidence.sn.
- Rattacher chaque fiche à sa page publique (lien source) et à sa date de collecte ; versionner les modifications comme pour les articles.
- Démarches en wolof : absentes à la source → traduction automatique étiquetée plus tard (P2), jamais présentée comme officielle.
- **Thèmes** : 15 catégories existent (`fetchCategorys` : « Citoyenneté, justice et sécurité », « Transports », « Santé et protection sociale »…, avec sous-catégories), mais au 26/09/2026 **aucune démarche n'y est rattachée** (`categories` vide sur les 718) et le filtre `demarcheFilter.categories` est ignoré par le serveur (718 résultats quel que soit le thème). L'app n'invente donc aucun regroupement : recherche et liste alphabétique, thèmes ajoutés le jour où la source les renseigne.
- Import du 26/09/2026 : 718 démarches, 0 échec ; faits renseignés à la source : coût 95, délai 104, conditions 7, pièces à fournir 6, démarches en ligne 7 ; services administratifs, FAQ et thèmes : aucun (après filtrage des bouche-trous).

### Classement des démarches par thème (26/09/2026)

e-senegal.sn publie 15 thèmes officiels mais ne rattache aucune démarche à un thème. Le classement est fait sur la plateforme :

- **Fichier de référence** : `apps/api/data/procedure-classification.json` (versionné, relu) : thèmes ajoutés et thème de chaque démarche (par identifiant de la démarche).
- **Application** : `pnpm --filter @bgs/api procedures:classify` (idempotent ; ne remplace jamais une validation faite par une personne dans la console ; chaque lot est journalisé).
- **Thèmes ajoutés** (`origin: platform`) : Agriculture, élevage et pêche · Environnement et ressources naturelles · Énergie, mines et hydrocarbures. Une nouvelle collecte des thèmes officiels ne les supprime pas.
- **Nouvelles démarches** : proposées automatiquement par mots clés (`procedures:themes`), puis validées dans la console.
- **Ordre de mise en service** : déployer d'abord la version du serveur qui connaît le champ `origin`, puis appliquer le classement.

## OpenStreetMap (services de l'État, import initial)

CLAUDE.md autorise un import initial depuis OpenStreetMap pour la carte des services, **jamais publié sans vérification** dans la console.

### Règles d'accès

- Données sous licence **ODbL** (Open Database License) : attribution obligatoire « © les contributeurs d'OpenStreetMap » avec un lien vers https://www.openstreetmap.org/copyright partout où les données sont montrées.
- Une base qui mélange les données d'OpenStreetMap et nos saisies devient une « base dérivée » : si elle est publiée, elle doit pouvoir être partagée sous la même licence. Point à valider avec le BIC (L-03).
- API publique Overpass (https://overpass-api.de/api/interpreter) : usage raisonnable, une seule requête par import, identifiant de l'application dans l'en-tête `User-Agent`.

### Requête

Une requête pour tout le Sénégal (zone `ISO3166-1=SN`) : `amenity=townhall|police|courthouse`, `office=government`, et les villes et quartiers (`place=city|town|suburb|quarter`) pour chercher sans localisation. Commande : `pnpm --filter @bgs/ingestion services:osm` (rejouable : aucun doublon, identifiant = type et numéro de l'objet OpenStreetMap).

### Classement

Par les étiquettes, puis par le nom : tribunal, commissariat, gendarmerie, mairie, préfecture (gouvernances, préfectures, sous-préfectures), ministère, sinon « administration ». Rien n'est deviné : ni horaires, ni téléphone, ni adresse s'ils manquent. Un site web non sécurisé (http) est écarté, jamais réécrit.

### Import du 27/09/2026

880 services lus (454 administrations, 175 mairies, 115 commissariats, 67 gendarmeries, 29 préfectures et gouvernances, 22 tribunaux, 18 ministères) et 251 villes (334 lieux avec les 83 quartiers ajoutés le même jour) ; 331 services dans la région de Dakar (zone pilote). Données rarement complètes : adresse 99, téléphone 46, horaires 34. Certaines entrées ne sont pas des services de l'État (fédération sportive, banque…) : la vérification humaine les écarte.

### Points d'attention

- Un service vérifié n'est jamais modifié en silence par un nouvel import : le changement est mis de côté et attend une nouvelle vérification.
- Les services qu'un import ne trouve plus restent en place (rien n'est supprimé automatiquement).

## Fond de carte (Protomaps, données OpenStreetMap)

Rues, quartiers, eau et noms de lieux sous les services de « Près de moi ». Ce fond ne sert qu'à se repérer : ses propres points d'intérêt sont retirés, la carte ne montre comme lieux que les services de l'État vérifiés.

- Tuiles vectorielles construites chaque jour par Protomaps à partir d'OpenStreetMap (et de Natural Earth aux petits zooms) ; seule la zone du Sénégal est découpée et stockée chez nous (`.data/tiles/senegal.pmtiles`).
- Servies par notre API avec le style, les lettres et les icônes : aucun service de carte extérieur n'est appelé par l'application.
- Même licence ODbL que ci-dessus : l'attribution avec son lien fait partie du style.
- Fichier en place : Protomaps Basemap 4.15.2, données du 27/09/2026 à 04 h (UTC). Procédure de mise à jour et pannes : `docs/runbooks/fond-de-carte.md`.
