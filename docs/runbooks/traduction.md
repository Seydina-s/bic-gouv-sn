# Traduire les articles en wolof et en anglais

Décisions de l'utilisateur (09 et 16/10/2026) : la langue choisie s'applique à toute l'app. Les articles sans version wolof officielle sont traduits en wolof ; tous les articles sont traduits en anglais (anglais américain), depuis le 02/04/2024 (gouvernement actuel). Modèle : **Claude Sonnet 5.5**, par lots (moitié prix, réponse en quelques heures). Chaque traduction est vérifiée avant d'être enregistrée et affichée avec la mention « Traduction automatique ». Si une version wolof officielle paraît plus tard, elle remplace la traduction automatique.

Prérequis : la clé Anthropic saisie par le porteur du projet (`docs/guides/brancher-l-assistant.md`). L'estimation, elle, fonctionne sans clé.

La langue se choisit avec `--lang wo` (wolof) ou `--lang en` (anglais). Les envois de chaque langue sont suivis séparément.

## 0. Essai (avant tout grand lot)

```
pnpm --filter @bgs/ingestion translate --lang wo --trial 10
pnpm --filter @bgs/ingestion translate --lang en --trial 10
```

- Les mêmes articles pour les deux langues : le plus récent de chaque institution, depuis le 02/04/2024, sans wolof ni anglais.
- La commande attend les réponses (quelques minutes à quelques heures), puis écrit `translation-trial-wo.json` ou `translation-trial-en.json` à côté des données, avec le français envoyé, la traduction et, le cas échéant, le motif du refus.
- **Rien n'est enregistré dans les articles** : un grand lot reprendra ces articles.

## 1. Estimer le coût (rien n'est envoyé)

```
pnpm --filter @bgs/ingestion translate --lang wo --estimate --since 2024-04-02
```

La commande plafonne l'estimation à 1 000 articles (taille d'un lot) ; le chiffrage complet de la phase est dans `docs/cadrage/phase-multilingue.md` (≈ 47 $ pour le wolof et ≈ 24 $ pour l'anglais depuis le 02/04/2024, avec Sonnet 5.5). L'estimation compte la consigne au prix plein pour chaque article ; en réalité elle est mise en cache, donc le coût réel est plus bas.

## 2. Envoyer

```
pnpm --filter @bgs/ingestion translate --lang en --submit --since 2024-04-02 --limit 1000
```

- Pour un autre modèle, utilisez la variable `TRANSLATION_MODEL`.
- Un article déjà envoyé n'est pas renvoyé tant que son lot n'a pas été collecté.

## 3. Collecter (quelques heures plus tard, au plus tard 24 h)

```
pnpm --filter @bgs/ingestion translate --lang en --collect
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
