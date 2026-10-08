# Les voix : lire les articles à voix haute

Chaque article est lu **une seule fois** par nos voix. Le fichier MP3 est rangé avec les photos, puis servi à tout le monde. Un million d'écoutes ne coûtent pas plus qu'une.

| Langue | Voix | Licence | Vitesse mesurée sur l'ordinateur de développement (i5, 4 cœurs) |
|---|---|---|---|
| Français | Piper `fr_FR-upmc-medium`, voix **Jessica** | données CC BY-SA 4.0 (citer l'auteur) | 8 fois plus rapide que l'écoute : environ 30 s de calcul par article |
| Wolof | **Adia_TTS** (CONCREE) | Apache 2.0 | 11 fois plus lente que l'écoute : environ 45 min de calcul par article |

Le wolof demande donc un serveur avec carte graphique pour tout l'historique. Sur un processeur seul, on ne peut traiter qu'une poignée d'articles récents.

## Installer (une fois)

1. Installez [uv](https://docs.astral.sh/uv/).
2. Dans `services/voices`, lancez `uv sync` : les versions sont figées dans `uv.lock`.
3. La voix française se télécharge au premier usage dans `.data/voices`, depuis la page officielle de Piper. Elle est vérifiée octet par octet, et refusée si son contenu change.
4. Le modèle wolof se télécharge depuis Hugging Face au premier usage.

## Enregistrer

```
pnpm --filter @bgs/api voices:record --lang fr --limit 50
pnpm --filter @bgs/api voices:record --lang wo --limit 3
```

- Les articles les plus récents passent en premier.
- Une version déjà enregistrée n'est pas refaite, tant que ses mots ne changent pas : une correction à la source, ou une traduction relue, déclenche un nouvel enregistrement.
- On peut arrêter puis relancer la commande à tout moment : ce qui est enregistré le reste.
- Les traductions automatiques en wolof sont lues aussi. Dans l'app, elles gardent leur mention « Traduction automatique ».

## Dans l'app

- **Avec un enregistrement** : le bouton « Écouter » lit le fichier, avec pause et reprise.
- **Sans enregistrement** : il reprend la voix du téléphone en français. En wolof, il affiche « Voix wolof bientôt disponible ».
- La lecture des fichiers demande le module audio de l'app : il faut une **nouvelle compilation** de l'app installée.
