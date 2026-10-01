# Logo et écran de démarrage : ce qu'il faut me fournir

Préparé le 01/10/2026 pour la séance sur le logo et l'écran de démarrage. Aujourd'hui, l'app utilise encore les icônes génériques du modèle Expo (point A-01 du backlog).

## L'essentiel : des fichiers maîtres, je fais le reste

Le plus simple et le plus sûr : **des fichiers vectoriels (SVG)**. À partir d'eux, je produis toutes les tailles demandées par iPhone, Android, le web et les notifications. Il n'y a rien à redimensionner de votre côté.

| # | Fichier | Contenu | Pourquoi |
|---|---|---|---|
| 1 | `logo-couleur.svg` | Le logo complet, en couleurs, sur fond **transparent** | Icône de l'app, écran de démarrage, console |
| 2 | `logo-blanc.svg` | Le même logo, **entièrement blanc**, fond transparent | Thème sombre, notifications Android |
| 3 | `logo-noir.svg` | Le même logo, **entièrement noir** (ou vert foncé), fond transparent | Icône « thème » d'Android 13 et plus, documents |
| 4 | `symbole.svg` (si votre logo a un texte) | Le **symbole seul**, sans le nom | Une icône d'app est petite : le texte y devient illisible |
| 5 | `baobab-traits.svg` | Le baobab dessiné **en traits** (contours), pas en surfaces pleines | L'écran de démarrage le dessine trait par trait (charte) |

Pour chaque SVG :
- les textes doivent être **convertis en tracés** (vectorisés) : sans cela, une police manquante change le dessin ;
- aucune image bitmap ne doit être incluse dans le SVG ;
- précisez les **codes couleur exacts** (hexadécimal, par exemple `#00853F`).

## Si vous ne pouvez fournir que des PNG

Fond **transparent**, sauf indication contraire, et **aux dimensions exactes** :

| Usage | Dimensions | Règle |
|---|---|---|
| Icône de l'app (iPhone et base générale) | 1024 × 1024 px | Carré, **sans transparence et sans coins arrondis** : le téléphone arrondit lui-même |
| Icône Android, premier plan | 1024 × 1024 px | Le symbole tient dans un **cercle central d'environ 626 px** : Android découpe le reste selon la forme de chaque téléphone |
| Icône Android, fond | 1024 × 1024 px, ou une simple couleur | Plein, sans motif près des bords |
| Icône Android « thème » (monochrome) | 1024 × 1024 px | Silhouette d'une seule couleur, même zone centrale |
| Écran de démarrage | 1024 × 1024 px | Le logo centré, pas plus d'environ 640 px de large ; la couleur de fond est réglée à part, en clair et en sombre |
| Petite icône des notifications (Android) | 96 × 96 px | **Blanc pur sur transparent**, silhouette simple : Android ignore les couleurs |
| Icône du site (web) | 48 × 48 px | Le symbole seul |

## L'écran de démarrage prévu (charte, CLAUDE.md §1)

- **Ce qui s'affiche.** Le baobab se dessine trait par trait, en moins de 1,5 seconde, puis un fondu mène à l'accueil.
- **Fluidité.** L'écran ne bloque jamais le chargement : l'app se prépare pendant l'animation.
- **Thèmes.** Il existe en version claire et en version sombre, et suit le thème du téléphone.
- **Le premier instant.** Avant toute animation, le système affiche une image fixe, le logo sur sa couleur de fond, dont la taille est imposée par iOS et Android. L'animation lui succède sans saut visible.
- **Technique.** Je l'anime à partir de `baobab-traits.svg`, sans outil payant. Si un designer préfère livrer une animation **Rive** (`.riv`), elle peut la remplacer : c'est le format prévu au stack.

## À clarifier en même temps

1. **Le droit d'usage.** Le logo est-il officiel (BIC, gouvernement) ? Si oui, il faut la preuve d'autorisation demandée par les stores (point L-01) : je ne publie rien qui imite une identité officielle sans elle.
2. **Le nom affiché** sous l'icône : « Bic Gouv SN » ou un nom plus court ? Une douzaine de caractères au plus restent visibles sur un téléphone.
3. **La couleur de fond** de l'icône et de l'écran de démarrage : blanc, vert drapeau (`#00853F`) ou autre ?
4. **La police** du logo, si elle doit aussi servir dans l'app : nom, et licence d'usage.
