# Modèle de contenu

Source : `packages/shared-types` (schémas Zod). Toute donnée qui entre ou sort (scraping, API, stockage local) est validée par ces schémas.

## Champs communs à tout contenu publié

| Champ TypeScript | Colonne SQL (future) | Rôle |
|---|---|---|
| `id` | `id` | UUID interne |
| `sourceUrl` | `source_url` | Page officielle d'origine. Seuls `presidence.sn` et `e-senegal.sn` sont acceptés. |
| `sourcePublishedOn` | `source_published_on` | Jour de publication donné par la source (`AAAA-MM-JJ` : presidence.sn ne donne pas d'heure), `null` si la source n'en affiche pas. Jamais deviné. |
| `sourceUpdatedAt` | `source_updated_at` | Dernière modification signalée par le back-office de la source, si disponible |
| `fetchedAt` | `fetched_at` | Date de collecte |
| `contentHash` | `content_hash` | SHA-256 du contenu, pour détecter les modifications |
| `version` | `version` | Incrémentée à chaque modification détectée, sans écrasement silencieux |
| `lang` | `lang` | Langue de la publication d'origine (`fr` ou `wo`) |
| `translations[]` | table `translations` | Une par langue. Statut `official`, `machine` ou `reviewed`. |
| `audio[]` | table `audio_tracks` | Pistes audio (P2), uniquement pour une langue traduite |
| `embedding` | `embedding` (pgvector) | Vecteur pour l'assistant IA (P2), `null` tant qu'il n'est pas calculé |

## Règles vérifiées automatiquement

- La langue d'origine est toujours présente en version `official`.
- Une version `official` renvoie toujours à sa page source.
- Une version `reviewed` porte toujours le relecteur et la date. Une version `machine` n'en porte jamais.
- Une seule version par langue.
- Toute image a une variante JPEG de secours, et aucune variante n'est plus large que l'original.
- Les champs inconnus sont refusés : un changement de structure côté source part en quarantaine au lieu d'être publié.

## Type implémenté

- `news-article` : article de presidence.sn. La rubrique (`category`) est un identifiant court, qui sera relevé dans `docs/sources.md` lors de la cartographie (Phase 1). Aucune liste de rubriques n'est inventée à l'avance.

Les fiches démarches (e-senegal.sn) et les services de la carte seront ajoutés lors de leurs phases respectives.
