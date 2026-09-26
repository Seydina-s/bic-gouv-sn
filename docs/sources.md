# Cartographie des sources officielles

Relevé du 25/09/2026 (tâche VS-01). Environ 40 requêtes au total, espacées d'au moins 1 seconde, avec un User-Agent qui identifie le projet.

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
