---
version: 1
slug: "apps-mobile-src-app-index-tsx"
primary_target: "apps/mobile/src/app/index.tsx"
related_targets: []
---

## Scope

Mobile app (adaptive: Android + iOS), first citizen surface: home news feed ("Accueil") and the article reader. Visitor mode: **Read**. Brand world for the whole product (admin inherits later).

Audience and job: Senegalese citizens on modest Android phones, often in bright light or on the move, some reading little. Job: know in seconds what the government did today, then read or (later) listen to one official text, traceable to presidence.sn.

Constraints: flag palette tokens (green dominant, yellow accent never text on white, red alerts only); white ground in light mode; Bricolage Grotesque + Manrope (provisional, S1-04); Phosphor icons; native navigation (tab bar, stack, system back); 48 dp targets; Dynamic Type / font scale; reduce motion; low-end GPU budget (no blur, no heavy shadows); no invented content, no official emblem.

Substitution: the user delegated every visual decision (autonomous mode, 25/09/2026). No decision page was shown; the assigned direction is built and the verdicts are recorded here.

## Direction contract

THESIS: The day's official news is a strip-woven cloth: each article is one narrow woven band, sewn edge to edge into "la pièce du jour". It refuses the category default of a government app: blue cards, a seal, and a carousel of stock photos.

OWN-WORLD: White cotton ground (dark: indigo-black thioup). Each band has a hairline seam above it and a 6 dp selvage on its leading edge, woven in a pattern that names its section: chevron for Conseil des ministres, dots for Communiqués, diagonal twill for International, ladder for Discours, diamond for Focus, dash for Interviews, grid for Agenda. The pattern is a thin SVG repeat, never behind text. Colors come from flag tints: green threads for official news, yellow thread only as a small "new" knot, red never decorative. The display face is set large for the day and date; the body face is used for bands and reading.

STORY: Opening the app, the reader sees today's date woven in big type and the number of bands; the first band (latest) is widest; they scan titles, recognise sections by pattern and colour, and open one to read it as plain, generous text with "Source : presidence.sn" and a link at the foot.

FIRST VIEWPORT: Top: day name + date in display type (left, 2 lines), small count "N actualités" under it, baobab hairline watermark at 4 % in the header corner. Below: bands full-width, each = selvage 6 dp + section label (caption, caps) + title (subtitle role, 3 lines max) + publication day; first band taller with the excerpt. Bottom: native tab bar (Accueil active). No image required: bands work text-only.

FORM: Strip-woven pagne (Manjak / Wolof strip cloth), position 5 of 7 on the grounded list; seed key 9db7b8bb.
- Raise (from brick instructions): wordless wayfinding: numerals and pictograms carry sequence wherever reading is not assumed.
- Raise (from film cutting bench): the place you stopped is marked: a folded "flag" knot on the band last opened, restored on return.
- Raise (from timetable slide rack): rank is carried by weight and case before size, so the hierarchy survives the largest system font sizes.
- Raise (from magazine identity): one mark per view: the baobab appears once as the recurring landmark, never repeated as decoration.
- Declined: tensegrity column (kept: state shown by structure, not colour alone); darkroom exposure record (kept: a strict tonal ramp as the only surface tokens).

SIGNATURE INTERACTION: New bands are woven in: on refresh, new articles slide in from the top edge one after another (40 ms stagger, spring "gentle"), and a thread-tension line crosses the header while loading. Reduce motion: crossfade.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Final typefaces (S1-04); real photos wait for the media pipeline (MED-01); Wolof UI strings wait for native writers (W-01).
