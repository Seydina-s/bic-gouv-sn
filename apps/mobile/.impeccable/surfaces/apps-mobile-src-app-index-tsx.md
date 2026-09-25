---
version: 2
slug: "apps-mobile-src-app-index-tsx"
primary_target: "apps/mobile/src/app/(tabs)/index.tsx"
related_targets: ["apps/mobile/src/app/article/[id].tsx", "apps/mobile/src/components/GlassTabBar.tsx"]
---

## Scope

Mobile app (adaptive: Android + iOS), first citizen surface: home news feed ("Accueil") and the article reader. Visitor mode: **Read**. Brand world for the whole product (admin inherits later).

Audience and job: Senegalese citizens on modest Android phones, often in bright light or on the move, some reading little. Job: know in seconds what the government did today, then read or (later) listen to one official text, traceable to presidence.sn.

Constraints: flag palette tokens (green dominant, yellow accent never text on white, red alerts only); white ground in light mode; Bricolage Grotesque + Manrope + Literata (provisional, S1-04); Phosphor icons; native navigation (tab bar, stack, system back); 48 dp targets; Dynamic Type / font scale; reduce motion; low-end GPU budget (blur only on iOS; Android glass is translucent without blur; no heavy shadows); no invented content, no official emblem.

Substitution: the first direction ("pagne tissé" only) was delegated and built in autonomous mode (25/09/2026). The user rejected it the same day and chose D-05 from a board of 5 directions with iPhone captures (decisions.md, 25/09/2026). The contract below records D-05 as shipped.

## Direction contract

THESIS: The day's official news as a newspaper front page ("La Une"), woven with the strip-cloth pagne: a masthead with the flag, the app's name and the date, one lead story with a full-width photo and a serif headline, then the other stories, each bordered by its section's weave. It refuses the category default of a government app: blue cards, a seal, and a carousel of stock photos.

OWN-WORLD: White cotton ground (dark: near-black with a faint green tint, neutral 950). Masthead = 4 dp tricolour flag stripe (decorative only), name in the display family, date, a 1 dp black rule beneath, the baobab once as a 6 % watermark. Headlines in Literata serif (lead 26/34, stories 18/24); body and UI in Manrope. Each section has its own woven pattern (chevron Conseil des ministres, dots Communiqués, twill International, ladder Discours, diamond Focus, dash Interviews, grid Agenda): 6 dp selvage on the leading edge of each story, 12 dp swatch before the section name, 6 dp strip across the top of the Council card. Patterns are thin SVG repeats, never behind text, always paired with the section's name. Green threads for official news; yellow only as the soft "last read" knot; red never decorative. One floating surface: a frosted-glass pill tab bar (real blur on iOS, translucent without blur on Android).

STORY: Opening the app, the reader sees today's front page: the name and date under the flag stripe, the latest story as the lead with its photo and serif headline, then the latest Conseil des ministres as a green card woven with chevrons, then the list. They recognise sections by pattern and name, open one, and read plain, generous text ending with "Source : presidence.sn" and a link to the original.

FIRST VIEWPORT: Top: flag stripe, app name (display family, title size, brand green), weekday + date, black rule, baobab watermark in the corner. Below: lead story = full-width photo (16:10), section tag, headline (lead-headline, 5 lines max), 3-line excerpt, "day · presidence.sn". Then the Council card (primary container, radius lg). Then story rows: selvage + section tag + serif title (3 lines max) + day, 92 × 72 thumbnail on the right when a photo exists. Bottom: floating glass tab bar (Accueil active: soft green indicator, filled icon, label). Stories work text-only when no photo exists.

FORM: Newspaper front page ("La Une", board screen 3) combined with the strip-woven pagne motifs (board screen 1), chosen by the user as D-05.
- Kept from the woven direction: wordless wayfinding (pattern names the section), the place you stopped is marked (the "last read" knot, restored on return), rank carried by weight and family before size so the hierarchy survives the largest font sizes, the baobab once per view.
- Added by D-05: flag stripe masthead, full-width lead photo, Literata serif headlines, highlighted Council card, right-hand thumbnails, floating frosted-glass tab bar.
- Dropped: the date set large in display type as the page title, the "N actualités" count, the widest-first band layout.

SIGNATURE INTERACTION: Stories are woven in: on load and refresh, the first 8 stories fade in rising 12 dp one after another (40 ms stagger, spring "gentle", native driver). Loading uses the native pull-to-refresh and a spinner (the planned thread-tension line was not built). Reduce motion: stories appear at once.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Final typefaces (S1-04); Wolof UI strings wait for native writers (W-01); two-pane layout on wide screens (RESP-01); D-05 validation on real phones before DESIGN.md is regenerated.
