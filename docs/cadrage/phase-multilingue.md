# Phase multilingue : cartographie et chiffrage (16/10/2026)

Demande de l'utilisateur (16/10) : finir le wolof, traduire tous les articles en anglais, une voix anglaise au moins égale à nos voix française et wolof, et une langue choisie qui change **toute** l'application. Décision du 09/10 : budget présenté d'un bloc avant tout engagement. **Rien de payant n'est lancé avant l'accord de l'utilisateur.**

## Articles visibles (copie des données du 16/10/2026, 16 h)

6 520 articles visibles (doublons et versions retirées exclus), 22 institutions, environ 12,9 millions de caractères de texte français.

| | Articles |
|---|---|
| Français officiel | 6 520 |
| Wolof officiel (Présidence) | 318 |
| Wolof en traduction automatique | 378 |
| Sans aucun wolof | 5 824 |
| Anglais | 0 |

Principales institutions : Santé 1 601 (dont environ 1 050 communiqués en PDF seul, et 1 591 sans date à la source), Enseignement supérieur 1 080, Présidence 980, Forces armées 515, Emploi-Formation 507, Hydraulique 306, Numérique 293, Primature 283, Agriculture 253, Énergie 177 ; les autres moins de 140.

Autres contenus en français : 718 fiches de démarches (environ 1,3 million de caractères, estimation haute), espace Entreprendre (environ 48 000 caractères), interface de l'app (environ 450 textes, 25 000 caractères). Le catalogue wolof de l'interface est vide et l'anglais n'existe pas encore dans le modèle de données (`langSchema` = fr, wo).

## Coût de la traduction (lots à moitié prix, marge mesurée de +30 % comprise)

Formules de `services/ingestion/src/translation/cost-estimate.ts` (consignes et exemples ≈ 1 930 jetons par article pour le wolof, ≈ 900 pour l'anglais ; 3,5 caractères par jeton en français, 1,3 en wolof). Tarifs par lots, par million de jetons lus / écrits : Opus 5.5 2 $ / 10 $, Sonnet 5 1 $ / 5 $, Haiku 4.5 0,50 $ / 2,50 $.

| Période | Wolof restant (Opus 5.5) | Anglais (Sonnet 5 / Opus 5.5) |
|---|---|---|
| Tout l'historique | 5 824 articles, ≈ 185 $ | 6 520 articles, ≈ 40 $ / 81 $ |
| Depuis le 02/04/2024 (gouvernement actuel) | 2 684 articles, ≈ 94 $ | 3 380 articles, ≈ 24 $ / 48 $ |
| Depuis le 01/10/2025 | 1 218 articles, ≈ 42 $ | 1 598 articles, ≈ 11 $ / 23 $ |

S'y ajoutent les démarches (≈ 20 $ en wolof, 4 à 8 $ en anglais) et l'interface (moins de 1 $). Ensuite, pour environ 400 nouveaux articles par mois : environ 13 $ par mois en wolof, 3 $ par mois en anglais (ordre de grandeur).

Note : la commande `translate:wolof --estimate` plafonne à 1 000 articles (taille d'un lot) ; les totaux ci-dessus sont calculés sur tous les articles avec les mêmes formules.

## Voix anglaise

Recommandation : **Kokoro en anglais** (moteur de notre voix française, déjà sur le serveur des voix, Apache 2.0, processeur seul, parmi les mieux notés de sa taille ; voix américaines et britanniques), comparé à l'aveugle avec **Chatterbox-Turbo** (MIT, plus expressif, plus lent sur processeur). Les modèles plus lourds (CosyVoice 3, Zonos) demandent une carte graphique : seulement si l'écoute montre un écart. Environ 12,9 millions de caractères à lire, après le rattrapage français puis wolof sur le serveur actuel, ou sur un second serveur temporaire.

## Changer la langue de toute l'application (travail sans coût)

Ajouter l'anglais au modèle, à l'API et à l'app ; catalogues complets de l'interface en wolof et en anglais ; la langue choisie s'applique à l'interface, aux articles, aux démarches, aux voix, à l'assistant et aux notifications ; trois langues proposées dès la présentation ; tout contenu absent dans la langue choisie s'affiche en français avec une mention.

## Décisions attendues de l'utilisateur

Point 58 de `.claude/session/A-FAIRE-UTILISATEUR.md` : période, modèle de l'anglais, accent, interface wolof, serveur des voix, budget.
