---
name: Bic Gouv SN
description: L'action gouvernementale du jour, mise en page comme la une d'un journal et tissée comme un pagne.
colors:
  flag-green: "#00853F"
  flag-yellow: "#FDEF42"
  flag-red: "#E31B23"
  background: "#FFFFFF"
  background-dark: "#131714"
  surface: "#F3F8F4"
  surface-dark: "#1A201B"
  surface-raised: "#FFFFFF"
  surface-raised-dark: "#232824"
  border: "#D7DCD8"
  border-dark: "#3F4440"
  border-strong: "#6D716E"
  border-strong-dark: "#898E8A"
  text-primary: "#2B2F2C"
  text-primary-dark: "#F3F8F4"
  text-secondary: "#555956"
  text-secondary-dark: "#C0C6C1"
  text-tertiary: "#6D716E"
  text-tertiary-dark: "#A4A9A5"
  text-brand: "#016A31"
  text-brand-dark: "#69BD80"
  primary: "#00853F"
  primary-dark: "#69BD80"
  primary-pressed: "#016A31"
  primary-pressed-dark: "#8DD99F"
  on-primary: "#FFFFFF"
  on-primary-dark: "#131714"
  primary-container: "#E5FFEA"
  primary-container-dark: "#013817"
  on-primary-container: "#025124"
  on-primary-container-dark: "#C2FECF"
  brand-surface: "#00853F"
  brand-surface-dark: "#025124"
  on-brand-surface: "#FFFFFF"
  accent-on-brand-surface: "#FDEF42"
  accent: "#FDEF42"
  on-accent: "#2B2F2C"
  on-accent-dark: "#131714"
  accent-container: "#FFFBBA"
  accent-container-dark: "#3D2A02"
  on-accent-container: "#553E01"
  on-accent-container-dark: "#FDEF42"
  danger: "#E31B23"
  danger-dark: "#FF796D"
  on-danger: "#FFFFFF"
  on-danger-dark: "#131714"
  danger-surface: "#FFF4F2"
  danger-surface-dark: "#5C0105"
  on-danger-surface: "#A70411"
  on-danger-surface-dark: "#FFCDC7"
  focus-ring: "#00853F"
  focus-ring-dark: "#69BD80"
  scrim: "#131714"
  glass: "#FFFFFF"
  glass-dark: "#232824"
  glass-border: "#D7DCD8"
  glass-border-dark: "#3F4440"
typography:
  display:
    fontFamily: "Bricolage Grotesque"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "44px"
  headline:
    fontFamily: "Bricolage Grotesque"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "36px"
  lead-headline:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "34px"
  title:
    fontFamily: "Bricolage Grotesque"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "30px"
  subtitle:
    fontFamily: "Manrope"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "26px"
  story-title:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Manrope"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-small:
    fontFamily: "Manrope"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Manrope"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Manrope"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
  full: "999px"
spacing:
  none: "0px"
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  glass-tab-bar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.full}"
    height: "64px"
  glass-tab-indicator-active:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.full}"
    width: "56px"
    height: "32px"
  glass-tab-label:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  glass-tab-label-active:
    textColor: "{colors.text-brand}"
  lead-story:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.lead-headline}"
    padding: "16px"
  lead-story-pressed:
    backgroundColor: "{colors.surface}"
  council-card:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.story-title}"
    rounded: "{rounded.lg}"
    padding: "16px"
  story-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.story-title}"
    padding: "16px 16px 16px 0"
    height: "48px"
  story-row-pressed:
    backgroundColor: "{colors.surface}"
  story-thumbnail:
    rounded: "{rounded.md}"
    width: "92px"
    height: "72px"
  section-tag:
    textColor: "{colors.text-brand}"
    typography: "{typography.caption}"
  last-opened-knot:
    backgroundColor: "{colors.accent-container}"
    textColor: "{colors.on-accent-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 8px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "48px"
  source-link:
    textColor: "{colors.text-brand}"
    typography: "{typography.label}"
    height: "48px"
---

# Design System: Bic Gouv SN

<!-- Relevé le 25/09/2026 sur le code livré (direction D-05). Source normative des valeurs : packages/ui/src/tokens/. Ce fichier décrit le système ; en cas d'écart, le code des tokens fait foi et ce fichier doit être régénéré. -->

## Overview

**Creative North Star: "La Une tissée"**

L'accueil est la une d'un journal du jour : un bandeau tricolore fin, le nom de l'application et la date comme un titre de quotidien, un filet noir dessous, puis une grande photo pleine largeur et un titre en serif. Sous la une, la carte « Dernier Conseil des ministres » et la liste des articles, chacun avec sa vignette à droite. C'est la direction D-05 choisie par l'utilisateur le 25/09/2026 : elle remplace l'ancienne direction « pagne tissé seul ».

Le pagne tissé en bandes (manjak / wolof) reste le fil conducteur : chaque rubrique a son motif tissé (chevron, points, sergé, échelle, losange, tiret, grille). Le motif borde chaque article (lisière), précède le nom de la rubrique (pastille) et traverse le haut de la carte du Conseil (bande). Il permet de reconnaître une rubrique sans dépendre de la couleur. Le fond est blanc coton en clair, presque noir à peine teinté de vert en sombre. Le vert du drapeau domine, le jaune reste rare, le rouge est réservé aux alertes.

La densité est celle d'un quotidien lisible sur petit écran : une colonne, des filets fins entre les articles, beaucoup d'air autour des titres. La profondeur se limite à une seule surface flottante, la barre d'onglets en verre dépoli. Le mouvement se réduit à une entrée « tissée » des articles, supprimée si le système demande de réduire les animations.

**Key Characteristics:**
- Une de journal : bandeau tricolore, nom + date, filet, photo pleine largeur, titre serif Literata.
- Un motif tissé par rubrique, toujours décoratif, jamais derrière un texte.
- Vert dominant, jaune en petite touche, rouge réservé aux alertes ; tokens sémantiques pour les deux thèmes.
- Plat par défaut ; une seule surface flottante : la barre d'onglets en verre.
- Le baobab une seule fois par vue, en filigrane très léger.

## Colors

La palette est celle du drapeau, déclinée en échelles de 50 à 900 (OKLCH), avec des neutres gris légèrement verdis pour accompagner le vert.

Échelles brutes : `packages/ui/src/tokens/palette.ts`. Rôles sémantiques clair et sombre : `packages/ui/src/tokens/colors.ts`. Les écrans n'utilisent que les rôles sémantiques (`theme.color.*`), jamais la palette brute ni un code couleur.

### Primary
- **Vert du drapeau** (`flag-green`, vert 600) : couleur dominante. Rôle `primary` pour les boutons principaux et les indicateurs de chargement, lisière tissée des articles.
- **Vert encre** (`text-brand`, vert 700 en clair, vert 400 en sombre) : titres de marque (nom de l'app dans l'en-tête), liens, nom de rubrique, bouton retour. Il est un cran plus sombre que le vert du drapeau parce que le vert 600 n'atteint que 4,41:1 sur `surface`.
- **Vert tendre** (`primary-container` / `on-primary-container`) : indicateur de l'onglet actif et carte « Dernier Conseil des ministres » (8,99:1 en clair, 11,63:1 en sombre).

### Secondary
- **Jaune du drapeau** (`flag-yellow` / `accent`) : badges et petites touches seulement ; texte dessus en `on-accent`.
- **Jaune pâle** (`accent-container` / `on-accent-container`) : le « nœud » qui marque l'article ouvert en dernier. C'est le seul usage du jaune dans le fil aujourd'hui.

### Tertiary
- **Rouge du drapeau** (`flag-red` / `danger`) : erreurs et avertissements uniquement, avec `danger-surface` / `on-danger-surface` pour les messages. Aucun usage décoratif en dehors du bandeau tricolore.

### Neutral
- **Blanc coton** (`background`, clair) / **Nuit verte** (`background-dark`, neutre 950) : fond des écrans.
- **Surface** et **surface relevée** : état pressé des articles, fond d'attente des photos, couches empilées en sombre (neutres 940 et 925 pour garder des couches distinctes).
- **Texte** : `text-primary` pour les titres et le corps, `text-secondary` pour les extraits et les libellés inactifs, `text-tertiary` pour les dates et la source (≥ 4,5:1 sur toutes les surfaces ; neutre 600 ajusté à #6D716E pour cela).
- **Filets** : `border` pour les séparateurs décoratifs, `border-strong` (≥ 3:1) pour les contours qui doivent rester visibles.
- **Verre** (`glass`, `glass-border`) : barre d'onglets flottante, toujours avec une opacité du token `opacity`.

### Named Rules
**La règle du drapeau muet.** Les trois couleurs exactes du drapeau (`flag-green`, `flag-yellow`, `flag-red`) sont identiques dans les deux thèmes et ne servent qu'au bandeau tricolore décoratif. Jamais de texte en `flag-*`.

**La règle du jaune porté.** Le jaune n'est jamais du texte sur fond blanc ou clair (contraste insuffisant). Il sert de fond, avec du texte `on-accent` / `on-accent-container`, ou de touche sur une surface verte (`accent-on-brand-surface`, en grand texte ou en icône seulement).

**La règle du rouge rare.** Le rouge signale une erreur ou un avertissement. Il ne décore rien, ne distingue aucune rubrique et ne sert pas à attirer l'œil.

**La règle des tokens seuls.** Aucune couleur en dur dans un écran ou un composant. Une translucidité passe par `withAlpha(token, opacity.*)` ; un contraste sur fond translucide se vérifie avec `composite()` (`packages/ui/src/color/contrast.ts`).

## Typography

**Display Font:** Bricolage Grotesque (600, 700, 800)
**Headline Font:** Literata (600, 700), serif de journal
**Body Font:** Manrope (400, 600, 700)

**Character:** Literata donne aux titres d'articles le ton d'un quotidien sérieux. Bricolage Grotesque, plus expressif, signe le nom de l'application. Manrope, net et ouvert, porte la lecture et l'interface. Les trois polices sont sous licence OFL et affichent tous les caractères wolof (ë, é, à, ó, ñ, ŋ).

**Statut : provisoire.** Le choix final des polices reste **ouvert (S1-04)** : comparaison FR + WO avec 2 ou 3 alternatives, décision de l'utilisateur. Changer de police revient à modifier `fontFace` dans `scales.ts` et le chargement expo-font, sans toucher aux écrans.

Sur Android, `fontWeight` ne sélectionne pas la graisse d'une police personnalisée : chaque graisse est un fichier distinct (`fontFace.*`). On change de graisse en changeant de `fontFamily`, jamais avec `fontWeight`.

### Hierarchy
- **Display** (Bricolage 800, 34/44) : réservé aux très grands titres d'écran. Sa famille sert aussi au nom de l'application dans l'en-tête, en taille `title`.
- **Headline** (Bricolage 700, 28/36) : titres d'écrans secondaires.
- **Lead headline** (Literata 700, 26/34) : titre de l'article à la une et titre de la page article. 5 lignes au plus dans le fil.
- **Title** (Bricolage 600, 22/30) : nom de l'application dans l'en-tête, titres de section.
- **Subtitle** (Manrope 700, 18/26) : intertitres dans le corps d'un article. Sa famille sert aussi au gras dans le texte et au libellé de l'onglet actif.
- **Story title** (Literata 600, 18/24) : titres d'articles dans la liste (3 lignes au plus) et dans la carte du Conseil (4 lignes au plus).
- **Body** (Manrope 400, 16/24) : lecture et extraits. Colonne de lecture limitée à 640 dp (≈ 65 caractères).
- **Body small** (Manrope 400, 14/20) : date, source, mention « traduction automatique ».
- **Label** (Manrope 600, 14/20) : boutons, liens d'action, date de l'en-tête.
- **Caption** (Manrope 600, 12/16) : libellés d'onglets et nom de rubrique. Uniquement pour des libellés courts, jamais pour de la lecture.

### Named Rules
**La règle du serif pour l'information.** Literata est réservée aux titres d'articles officiels (`lead-headline`, `story-title`). L'interface (boutons, onglets, libellés) reste en Manrope.

**La règle de l'interligne large.** L'interligne vaut au moins 1,25 fois la taille pour que les diacritiques français et wolof (É, Ë, Ñ, Ŋ) ne soient jamais rognés.

**La règle de la taille système.** Les tailles sont en sp et suivent le réglage de taille de texte du téléphone. Aucun texte ne désactive la mise à l'échelle. La hiérarchie repose sur la graisse et la famille autant que sur la taille, pour tenir aux plus grandes tailles système. Seul le libellé d'onglet peut réduire sa police à 80 % pour tenir sur une ligne.

## Layout

- **Rythme** : grille de 4 dp (`space`, de `xxs` 2 à `xxxl` 48). Marge latérale standard `lg` (16 dp). Écart entre la rubrique et le titre : `xs` à `sm`.
- **Colonne** : une colonne unique. Sur grand écran, le fil est centré dans une largeur de `readingMaxWidth + xxxl` (688 dp) et l'article dans `readingMaxWidth` (640 dp). Les deux volets liste + détail restent **ouverts (RESP-01)**.
- **Tailles de fenêtre** : `compact` < 600 dp, `medium` ≥ 600, `expanded` ≥ 840 (classes Material). La mise en page dépend de la largeur de la fenêtre, recalculée en direct (rotation, pliage, multi-fenêtre), jamais du type d'appareil.
- **Photos** : photo de la une pleine largeur au format 16:10 (`layout.leadAspectRatio`), photo d'article en 16:9 (`layout.coverAspectRatio`) pleine largeur sur téléphone et encadrée (`radius.md`) quand la fenêtre dépasse la colonne de lecture. Vignette de liste 92 × 72 dp (`layout.thumbnail`) à droite du titre.
- **Dimensions de la charpente** : barre d'onglets `layout.tabBar` (64 dp, marges 12 dp), bandeau tricolore `layout.flagStripe` (4 dp), flou `layout.glassBlur`, filigrane `opacity.watermark` (6 %), carte pressée `opacity.cardPressed`, capitales `tracking.caps`. Aucune de ces valeurs n'est écrite dans un composant. Recadrage, jamais de déformation ; BlurHash pendant le chargement.
- **Zones sûres** : l'en-tête commence sous l'encoche (`insets.top`). La barre d'onglets flotte au-dessus de la zone gestuelle. Chaque liste réserve en bas l'espace de la barre (`useTabBarInset()`), pour que le dernier article ne soit jamais caché.
- **Ordre de la une** : en-tête → article à la une → carte du Conseil → liste. Cet ordre est calculé dans `features/news/front-page.ts`, pas dans l'écran.

## Elevation & Depth

Le système est plat : les couches se distinguent par le ton (`background` → `surface` → `surface-raised`) et par des filets fins. Une seule surface porte une ombre et un effet de verre : la barre d'onglets flottante. Sur iOS, un vrai flou système (`BlurView`, intensité 40) est posé sous un voile `glass` à `opacity.glass` (0,82). Sur Android, il n'y a pas de flou, trop coûteux pour les GPU d'entrée de gamme : la même forme utilise un voile presque opaque à `opacity.glassOpaque` (0,94).

### Shadow Vocabulary
- **Flottement de la barre** (iOS : `shadowColor: scrim`, décalage 0/8, rayon 24, opacité 0,14 ; Android : `elevation: 8`) : barre d'onglets uniquement.

### Named Rules
**La règle de la seule surface flottante.** Seule la barre d'onglets flotte. Les cartes, articles et photos restent posés à plat : aucune ombre et aucun flou ailleurs.

**La règle du verre lisible.** Tout texte posé sur le verre doit atteindre 4,5:1 contre le pire fond possible (photo entièrement blanche ou entièrement noire qui défile dessous), calculé avec `composite(glass, opacity, fond)`, dans les deux thèmes et pour les deux opacités. Le test `packages/ui/src/tokens/colors.test.ts` en est la garde.

## Shapes

- **Rayons** : `sm` 6, `md` 12 (vignettes, photos encadrées, boutons), `lg` 20 (carte du Conseil), `full` (barre d'onglets, indicateur actif, nœud « dernier ouvert »).
- **Filets** : filet noir de 1 dp (`text-primary`) sous l'en-tête, comme sous le titre d'un journal ; filet fin (`hairlineWidth`, `border`) au-dessus de chaque article de la liste et au-dessus de la source dans un article.
- **Tissage** : motifs SVG en répétition sur une tuile de 6 × 8 dp. Lisière verticale de 6 dp, bande horizontale de 6 dp, pastille de 12 × 12 dp.
- **Bandeau tricolore** : trois bandes égales vert / jaune / rouge, 4 dp de haut, en haut de l'en-tête.
- **Baobab** : dessin au trait fin (1,2), 72 dp, en filigrane à 6 % dans le coin de l'en-tête. Ce n'est pas un emblème officiel.

## Components

Chaque changement visuel passe par les tokens (`packages/ui/src/tokens/`) ou par l'un des composants ci-dessous. Les constantes de forme propres à un composant (hauteur de barre, taille du bandeau, dimensions de vignette) restent privées à ce composant. Un écran n'en redéfinit jamais.

### Barre d'onglets en verre (`components/GlassTabBar.tsx`)
Une pilule flottante, discrète, par-dessus le contenu qui défile.
- **Forme** : pilule (`rounded.full`), 64 dp de haut, à 12 dp des bords (plus les zones sûres), contour `glass-border` fin.
- **Matière** : flou réel sur iOS et le web, translucide sans flou sur Android (voir Elevation & Depth).
- **États** : onglet actif = indicateur vert tendre de 56 × 32 dp, icône Phosphor pleine (`fill`) en `on-primary-container`, libellé en Manrope 700 `text-primary` (le vert de marque descend sous 4,5:1 sur le verre dans le pire cas ; l'état actif se lit à la pilule verte, à l'icône pleine et à la graisse, jamais à la couleur seule). Onglet inactif = icône `regular` et libellé `caption` en `text-secondary`. Pression = opacité réduite.
- **Règles** : une icône est toujours accompagnée de son libellé. Rôles d'accessibilité `tablist` / `tab` avec l'état `selected`. Les écrans réservent l'espace de la barre avec `useTabBarInset()`.

### En-tête de la une (`features/news/Masthead.tsx`)
- Bandeau tricolore (décoratif, masqué aux lecteurs d'écran), nom de l'app en famille display à la taille `title` en `text-brand` (rôle `header`), jour et date en `label` `text-secondary`, filet noir dessous, baobab en filigrane.

### Article à la une (`LeadStory`, `features/news/Stories.tsx`)
- Photo pleine largeur en 16:10, puis rubrique, titre `lead-headline` (5 lignes au plus), extrait `body` `text-secondary` (3 lignes au plus), et « date · presidence.sn » en `body-small` `text-tertiary`. Pression : fond `surface`.

### Carte « Dernier Conseil des ministres » (`CouncilCard`)
- Fond vert tendre, `rounded.lg`, bande tissée de chevrons en haut. Titre `story-title` (4 lignes au plus), date, puis l'action « Lire le communiqué » avec une flèche Phosphor. Tout le texte est en `on-primary-container`. Elle affiche toujours le dernier Conseil, même s'il est ancien.

### Article de la liste (`StoryRow`)
- Lisière tissée de 6 dp en `primary` sur le bord de départ, rubrique, titre `story-title` (3 lignes au plus), date `body-small` `text-tertiary`, vignette 92 × 72 `rounded.md` à droite si une photo existe. Filet fin au-dessus, hauteur minimale de 48 dp, fond `surface` à la pression.
- Le lecteur d'écran annonce « rubrique. titre. date » ; la vignette est décorative (le titre porte le sens).

### Rubrique (`features/news/SectionTag.tsx`)
- Pastille tissée de la rubrique, puis le nom de la rubrique en `caption`, en capitales espacées (0,8), `text-brand` par défaut. Le texte est toujours le nom réel de la rubrique source (presidence.sn) via l'i18n, jamais une accroche inventée.
- **Nœud « dernier ouvert »** : pilule `accent-container` / `on-accent-container`, alignée à droite, sur l'article ouvert en dernier (restauré au retour).

### Motifs tissés (`features/news/Selvage.tsx` : `Selvage`, `WovenStrip`, `WovenSwatch`)
Le tissage identifie la rubrique.
- Un motif par rubrique : chevron (Conseil des ministres), points (Communiqués), sergé diagonal (International), échelle (Discours), losange (Focus), tiret (Interviews), grille (Agenda). Les autres rubriques ont un fil vertical simple.
- Toujours décoratif (masqué aux lecteurs d'écran), jamais derrière un texte, toujours doublé du nom de la rubrique en toutes lettres. Une nouvelle rubrique reçoit un nouveau motif dans `PATTERNS`, jamais une nouvelle couleur.

### Photo (`features/news/CoverImage.tsx`)
- Variante WebP la plus petite suffisante pour la largeur de l'emplacement et la densité de l'écran (JPEG de secours), BlurHash pendant le chargement, fondu `motion.duration.normal`, fond `surface`. Décorative à côté d'un titre ; décrite (`label`) dans un article.

### Corps d'article (`features/news/BlockRenderer.tsx`)
- Paragraphes `body` `text-primary` espacés de `lg`, intertitres `subtitle`, citations en italique `text-secondary` en retrait `xl`, puces de liste en `text-brand`, liens en `text-brand`, images `rounded.md`. Composants natifs uniquement, aucun HTML.

### Page article (`app/article/[id].tsx`)
- Photo, rubrique, titre `lead-headline` (rôle `header`), date (et « traduction automatique » si c'est le cas), corps, puis un filet et la mention « Source : presidence.sn », suivie du lien vers l'original (`source-link`, 48 dp, icône Phosphor, `text-brand`).

### Bouton principal (`button-primary`, message d'erreur du fil)
- Fond `primary`, texte `label` `on-primary`, `rounded.md`, 48 dp de haut au minimum, marge intérieure horizontale `xl`.

### Icônes (`components/Icon.tsx`)
- Phosphor uniquement, un fichier d'icône importé à la fois, tailles `iconSize` (16 / 24 / 32), graisse `regular` (`fill` pour l'onglet actif). Un libellé d'accessibilité est obligatoire, sauf quand l'icône accompagne un texte visible.

### Mouvement signature (`features/news/WovenIn.tsx`)
- Les articles du premier écran (8 au plus) entrent « tissés » : fondu et montée de 12 dp, décalés de 40 ms, ressort `motion.spring.gentle`, moteur natif (opacité + translation seulement). Avec « réduire les animations », ils apparaissent directement.

## Do's and Don'ts

### Do:
- **Do** faire passer tout changement visuel par les tokens de `packages/ui/src/tokens/` ou par un composant listé ci-dessus. Un écran assemble des composants et lit `theme.*`, rien d'autre.
- **Do** vérifier chaque nouvelle paire texte / fond en WCAG AA dans les deux thèmes : 4,5:1 pour le texte, 3:1 pour les grands textes et les contours. Ajouter la paire aux tests de `colors.test.ts`.
- **Do** vérifier tout texte posé sur le verre contre un fond blanc pur et noir pur, avec `opacity.glass` et `opacity.glassOpaque`.
- **Do** garantir une cible tactile d'au moins 48 dp (`touchTarget.min`) pour tout élément pressable.
- **Do** laisser le texte suivre la taille système. Tester à la plus grande taille, en français et en wolof.
- **Do** remplacer tout mouvement par une apparition directe ou un fondu quand « réduire les animations » est actif.
- **Do** donner un motif tissé à chaque nouvelle rubrique et l'accompagner de son nom.
- **Do** afficher « Source : presidence.sn » et le lien vers l'original au pied de chaque article.

### Don't:
- **Don't** écrire une couleur, une taille de police, un espacement ou un rayon en dur dans un écran.
- **Don't** utiliser le jaune comme couleur de texte sur fond blanc ou clair.
- **Don't** utiliser les couleurs `flag-*` pour autre chose que le bandeau tricolore décoratif.
- **Don't** utiliser le rouge pour décorer ou distinguer une rubrique.
- **Don't** poser un motif tissé ou le baobab derrière un texte, ni afficher le baobab plus d'une fois par vue.
- **Don't** ajouter du flou sur Android, ni une deuxième surface flottante ou ombrée.
- **Don't** coder une information par la couleur seule : motif + mot, icône + libellé.
- **Don't** utiliser `fontWeight` pour changer de graisse d'une police personnalisée : utiliser la face `fontFace` correspondante.
- **Don't** placer une accroche ou un sur-titre inventé au-dessus d'un titre. Seul le nom réel de la rubrique source peut précéder un titre. Exception décidée par l'utilisateur (D-05, écran 3 de la planche) : « Dernier Conseil des ministres » sur la carte du Conseil, qui dit pourquoi cette carte est mise en avant.

## Points ouverts

- **Polices finales (S1-04)** : Bricolage Grotesque, Manrope et Literata sont provisoires en attendant la comparaison FR + WO et le choix de l'utilisateur.
- **Textes d'interface en wolof (W-01)** : en attente de rédacteurs natifs. Les longueurs wolof n'ont pas encore été vérifiées dans les libellés d'onglets ni dans les rubriques.
- **Deux volets sur grand écran (RESP-01)** : pour l'instant, une colonne centrée.
- **Validation sur téléphone** de D-05 (décisions du 25/09/2026) : DESIGN.md sera régénéré après cette validation.
