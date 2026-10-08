# Traduire en wolof les articles sans version officielle

La Présidence ne publie plus d'articles en wolof depuis le 1er octobre 2025. Cette commande traduit en wolof les articles qui n'ont **aucune** version wolof, par lots (moitié prix, réponse en quelques heures). Chaque traduction est vérifiée avant d'être enregistrée. Elle est affichée dans l'app avec la mention « Traduction automatique ». Si la version wolof officielle paraît plus tard, elle remplace la traduction automatique.

Prérequis : la clé Anthropic saisie par le porteur du projet (`docs/guides/brancher-l-assistant.md`). L'estimation, elle, fonctionne sans clé.

## 1. Estimer le coût (rien n'est envoyé)

```
pnpm --filter @bgs/ingestion translate:wolof --estimate --since 2025-10-01
```

Mesuré le 08/10/2026 sur la base réelle :

| Périmètre | Articles | Claude Opus 5.5 (lots) | Claude Haiku 4.5 (lots) |
|---|---|---|---|
| Depuis le 1er octobre 2025 | 379 | ≈ 8,70 $ | ≈ 2,20 $ |
| Tout l'historique sans wolof | 658 | ≈ 14,75 $ | ≈ 3,70 $ |

L'estimation compte la consigne et les exemples au prix plein pour chaque article. En réalité, ils sont mis en cache et coûtent moins cher, donc le coût réel est plus bas.

## 2. Envoyer

```
pnpm --filter @bgs/ingestion translate:wolof --submit --since 2025-10-01 --limit 30
```

- Commencez par une trentaine d'articles et faites relire quelques traductions par un locuteur natif avant d'envoyer le reste.
- Modèle par défaut : Claude Opus 5.5, celui de l'essai du 03/10 jugé « parfait ». Pour un autre modèle, utilisez la variable `TRANSLATION_MODEL`.
- Un article déjà envoyé n'est pas renvoyé tant que son lot n'a pas été collecté.

## 3. Collecter (quelques heures plus tard, au plus tard 24 h)

```
pnpm --filter @bgs/ingestion translate:wolof --collect
```

La commande affiche :

- les traductions enregistrées ;
- celles écartées par les contrôles (réponse illisible, structure ou images modifiées, longueur anormale, texte vide) ;
- les échecs du service ;
- les articles modifiés entre-temps (ils seront renvoyés au prochain envoi) ;
- le coût réel de la collecte.

## Contrôles appliqués à chaque traduction

- Mêmes balises, dans le même ordre, et mêmes images que le français.
- Longueur comprise entre 0,6 et 2,2 fois celle du français.
- HTML nettoyé comme tout article collecté.
- Rien n'est enregistré si l'article a changé depuis l'envoi.

Les nouveaux articles (≈ 35 par mois, moins de 1 $) se traitent de la même façon. L'automatisation après chaque collecte viendra une fois la qualité confirmée par la relecture.
