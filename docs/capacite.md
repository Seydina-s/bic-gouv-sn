# Capacité de l'API — mesures

Sert au chiffrage de l'hébergement (S1-02) et à la préparation du lancement (Phase 7). Chaque mesure indique la machine, la version et la méthode : un chiffre sans contexte ne vaut rien.

## Mesure du 28/09/2026

- **Machine** : ordinateur portable de développement (Windows 11), **un seul processus** Node 24, API construite (`dist/server.mjs`), données réelles : 970 articles, 718 démarches.
- **Méthode** : `autocannon`, 50 connexions simultanées pendant 15 s, réponses compressées (gzip), instance d'essai séparée (limite anti-abus relevée pour l'essai seulement).

| Route | Avant (PERF-04 seul) | Après PERF-05 | Latence médiane après |
|---|---|---|---|
| Détail d'un article `/v1/news/:id` | ~1 040 req/s | inchangé | 45 ms |
| Liste `/v1/news?limit=20` | ~128 req/s | **~630 req/s** | 71 ms |
| Rubriques `/v1/news/sections` | ~38 req/s | **~278 req/s** | 168 ms |
| Recherche `/v1/news/search` | ~13 req/s | ~13 req/s (première fois) ; **~300 req/s** pour une recherche répétée (PERF-06) | 154 ms répétée (max 0,56 s) |

PERF-04 : fichier des articles gardé en mémoire tant qu'il ne change pas. PERF-05 : tri des articles et extraits mis en cache (invalidés dès que le contenu change). PERF-06 : une recherche répétée est réutilisée 60 s (comme le cache public de sa réponse), et une recherche en cours de calcul est partagée par les demandes identiques qui arrivent en même temps.

## Ce que cela veut dire pour 20 millions d'installations

- Le trafic massif (ouverture de l'app après un Conseil des ministres) porte sur la liste, les rubriques et le détail. Ces réponses sont **publiques et cachables** (`Cache-Control` avec `stale-while-revalidate`, `ETag`) : en production, le CDN en sert l'essentiel et l'API ne reçoit que les rafraîchissements.
- L'API est sans état : on multiplie les processus (un par cœur) et les machines derrière un répartiteur de charge.
- La recherche est la route la plus coûteuse ; ses réponses sont aussi mises en cache par le CDN. Le moteur dédié (Meilisearch, SEARCH-01) reste prévu pour la montée en charge.
- À refaire sur la machine cible avant le lancement (test de charge k6 de la Phase 7), avec le CDN devant.
