# Fond de carte : tuiles, étiquettes, icônes

Le fond de carte de « Près de moi » (rues, quartiers, eau, noms de lieux) est servi **par notre propre API**, sous `/v1/map/`. Aucun service de carte extérieur ne voit quelle partie de la carte les gens regardent, et rien n'est facturé à l'affichage (CLAUDE.md §4.1). En production, un CDN sert ces fichiers.

La carte ne montre **que les services de l'État vérifiés** : les points d'intérêt du fond de carte (commerces, stades, bureaux de poste…) sont retirés du style.

## Ce qui compose le fond de carte

| Fichier | Rôle | Variable |
|---|---|---|
| `.data/tiles/senegal.pmtiles` (≈ 217 Mo) | Tuiles vectorielles du Sénégal, zooms 0 à 15 | `MAP_TILES_PATH` |
| `.data/map/glyphs/…` | Lettres des étiquettes (Noto Sans) | `MAP_ASSETS_ROOT` |
| `.data/map/sprites/…` | Icônes du fond de carte, clair et sombre | `MAP_ASSETS_ROOT` |

Adresses servies :

- `GET /v1/map/style.json?theme=light|dark` : le style lu par l'application (cache 1 h) ;
- `GET /v1/map/tiles/{z}/{x}/{y}` : une tuile, envoyée compressée telle qu'elle est stockée (cache 1 jour, version périmée acceptée 1 semaine) ;
- `GET /v1/map/glyphs/…` et `GET /v1/map/sprites/…` : lettres et icônes (cache 1 semaine).

Ces adresses ne comptent pas dans la limite de 600 demandes par minute : ce sont des fichiers statiques, et une carte en demande des dizaines d'un coup.

**Confidentialité** : les tuiles qu'une personne charge autour d'elle indiquent à peu près où elle se trouve. Les requêtes de carte ne sont donc **pas journalisées** par l'API (seuls les avertissements et les erreurs le sont). En production, les journaux d'accès du CDN pour `/v1/map/` doivent être désactivés ou anonymisés (MAP-10).

## Installer ou rafraîchir (équipe technique)

Lettres et icônes, avec leurs textes de licence (rejouable sans risque) :

```
pnpm map:assets
```

Tuiles : environ une fois par mois, ou quand les rues changent beaucoup.

1. Installer l'outil libre `pmtiles` (projet go-pmtiles, page « Releases » sur GitHub).
2. Choisir la construction quotidienne la plus récente sur https://maps.protomaps.com/builds/ (fichier `AAAAMMJJ.pmtiles`).
3. Découper le Sénégal : seule cette zone est téléchargée (≈ 200 Mo, pas la planète entière).
   ```
   pmtiles extract https://build.protomaps.com/AAAAMMJJ.pmtiles senegal.pmtiles --bbox=-17.6,12.2,-11.3,16.8
   ```
4. Contrôler : `pmtiles show senegal.pmtiles` doit indiquer `max zoom: 15`, des limites proches de `-17.6, 12.2` à `-11.3, 16.8`, et `tile compression: gzip`.
5. Remplacer `.data/tiles/senegal.pmtiles`, puis **redémarrer l'API** : le fichier est ouvert au démarrage.
6. Vérifier : `GET /v1/map/tiles/14/7397/7515` (centre de Dakar) doit répondre `200`.

Fichier en place au 27/09/2026 : Protomaps Basemap 4.15.2, données OpenStreetMap du 27/09/2026 à 04 h (UTC).

## Pannes

| Ce qu'on voit | Cause probable | Que faire |
|---|---|---|
| Journal : `MAP_UNAVAILABLE` ; la carte reste grise, la liste des services fonctionne | Fichier des tuiles absent au démarrage de l'API | Replacer le fichier (étapes 1 à 5), redémarrer l'API |
| Carte sans aucun nom de lieu | Lettres des étiquettes absentes | `pnpm map:assets`, puis vérifier `MAP_ASSETS_ROOT` |
| Flèches de sens unique, numéros de routes ou points des villes absents | Icônes absentes | `pnpm map:assets` |
| Carte vide dans un navigateur, erreur « Failed to fetch » sur les tuiles | Tuile annoncée compressée mais envoyée décompressée (erreur corrigée le 27/09/2026, voir ERREURS.md) | Vérifier que la réponse d'une tuile commence par les octets `1f 8b` |

## Licences

- **Données** : OpenStreetMap, licence **ODbL**. L'attribution « © les contributeurs d'OpenStreetMap » fait partie du style et s'affiche sur la carte. Les petits zooms utilisent aussi Natural Earth (domaine public).
- **Style et lecture des tuiles** : bibliothèques `@protomaps/basemaps` et `pmtiles`, licence BSD-3-Clause.
- **Lettres des étiquettes** : Noto Sans, SIL Open Font License ; texte dans `.data/map/glyphs/OFL.txt`.
- **Icônes** : dérivées de tangrams/icons (Mapzen, 2017), licence MIT ; texte dans `.data/map/sprites/LICENSE.md`. L'avis de licence doit aussi figurer dans les mentions de l'application (backlog MAP-09).
