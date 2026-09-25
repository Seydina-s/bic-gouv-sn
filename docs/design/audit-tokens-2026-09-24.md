# Audit des tokens de design — 24/09/2026

Périmètre : `packages/ui` (palette, couleurs sémantiques, typographie, espacements, rayons, animations) et l'écran vide de `apps/mobile`. Aucun écran réel n'existe encore.
Grilles utilisées : Impeccable (`audit.native`, `craft-floor`, `typeset`, `android`) et ui-ux-pro-max (règles, sans sa base de données, absente sur ce poste).

## Score avant correction (tokens seulement)

| Dimension | Score | Constat principal |
|---|---|---|
| Accessibilité | 3/4 | Contraste AA testé, mais pas de rôle « texte tertiaire », et les hauteurs de ligne étaient des ratios inutilisables en React Native |
| Performance | 3/4 | Pas de souci côté tokens ; police Material Symbols de 967 Ko embarquée par Expo Router (PERF-01) |
| Apparence et thèmes | 2/4 | Rôles incomplets (conteneurs, voile, niveaux de surface), bordure invisible sur les surfaces surélevées en mode sombre |
| Conformité plateforme | 2/4 | Pas de rôles typographiques Material ; graisses de police inopérantes sur Android pour une police personnalisée |
| Adaptativité | 1/4 | Aucun point de rupture défini, alors que la charte exige tablettes et pliables |
| **Total** | **11/20** | Acceptable, avec un travail significatif nécessaire |

## Corrections appliquées

| Priorité | Constat | Correction |
|---|---|---|
| P1 | `lineHeight` exprimé en ratio (1.2 / 1.45) : React Native attend une valeur absolue | Rôles typographiques complets (`display` → `caption`) avec taille et hauteur de ligne absolues |
| P1 | `fontWeight` ne sélectionne pas la graisse d'une police personnalisée sur Android | Une police par graisse (`fontFace`), chargées par expo-font |
| P1 | Aucun point de rupture pour tablettes et pliables | Classes de fenêtre Material : compact (< 600), medium (600–839), expanded (≥ 840), plus `windowClass()` |
| P1 | Diacritiques wolof (Ë, Ñ, Ŋ) : risque de coupure avec des interlignes serrés | Interligne ≥ 1,25 × la taille, vérifié par test ; glyphes wolof vérifiés dans les 6 fichiers de police |
| P2 | Mode sombre : bordure identique à la surface surélevée, et saut trop brutal entre fond et surface | 2 nuances tonales (`neutral` 925 et 940) ; lisibilité des bordures et des niveaux testée |
| P2 | Rôles manquants : texte tertiaire, conteneurs vert/jaune, voile de modale | `textTertiary`, `primaryContainer`, `accentContainer`, `scrim`, avec les opacités (désactivé 0,38, pressé 0,12, voile 0,6) |
| P2 | Animations : pas de ressorts, sorties aussi longues que les entrées | Ressorts `snappy` / `gentle`, durées de sortie ≈ 70 % des entrées |
| P2 | Texte tertiaire à 4,498:1 sur le fond gris (seuil 4,5) | `neutral` 600 ajusté de `#6E736F` à `#6D716E` |
| P3 | Tailles d'icônes non normalisées | `iconSize` (16 / 24 / 32) |

## Choix consignés

- **Pas de Dynamic Color** (couleurs tirées du fond d'écran sur Android 12+) : les couleurs du drapeau sont l'identité d'un service public.
- Polices provisoires : Bricolage Grotesque et Manrope (OFL), en attente du comparatif S1-04. Seules les 6 graisses utilisées sont embarquées (564 Ko ; un sous-ensemble limité aux caractères latins et wolof reste à faire).

## À faire ensuite

- `/impeccable init` à la prochaine session, pour écrire `PRODUCT.md` et `DESIGN.md`. Les skills ne se chargent qu'au démarrage d'une session.
- Ombres et élévation : à définir avec les premiers composants.
- Réparer l'installation de ui-ux-pro-max : ses dossiers `data` et `scripts` sont des liens cassés.
