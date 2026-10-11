# Les voix : lire les articles à voix haute

Chaque article est lu **une seule fois** par nos voix. Le fichier MP3 est rangé avec les photos, puis servi à tout le monde. Un million d'écoutes ne coûtent pas plus qu'une.

| Langue | Voix | Licence | Vitesse mesurée sur le serveur des voix (CPX32, 4 processeurs) |
|---|---|---|---|
| Français | **Kokoro-82M**, voix `ff_siwis` (choisie par l'utilisateur à l'écoute en aveugle, 10/10/2026 ; remplace Jessica) | Apache 2.0, données SIWIS | 3,7 fois plus rapide que l'écoute : environ 30 s de calcul par article |
| Wolof | **Adia_TTS** (CONCREE) | Apache 2.0 | 9,5 fois plus lente que l'écoute : environ 20 min de calcul par article |

## Le lecteur intelligent (français)

Avant d'être lu, le texte français est préparé (`apps/api/src/voices/french-reading.ts`). Le texte affiché dans l'app reste celui de la source.

- Titres et abréviations développés : « S.E.M. » devient « Son Excellence Monsieur », « M. » « Monsieur », « Mme » « Madame », « Dr » « Docteur », « n° » « numéro », etc.
- Mots en capitales : un titre en capitales est lu comme des mots ordinaires ; un sigle est épelé (« P-M-E ») ou lu comme un mot (« Cédéao »).
- Lexique (`apps/api/src/voices/french-lexicon.ts`) : les mots en capitales fréquents dans nos articles et les noms que la voix prononce mal. Chaque lecture y est écoutée et validée par l'utilisateur. Une prononciation peut y être donnée en phonèmes, quand aucune graphie ne suffit (Diagne, Niang).
- Changer le lexique : modifier l'entrée, puis augmenter `version`. Les articles français sont alors enregistrés à nouveau ; en attendant, l'app reprend la voix du téléphone pour ceux qui ne sont pas encore refaits.

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

## Sur le serveur des voix (Hetzner)

Le serveur (guide `docs/guides/creer-le-serveur-ia.md`) lit les textes à la place de l'ordinateur. L'ordinateur garde les articles et les fichiers : il envoie les textes, le serveur renvoie les MP3, et rien n'y reste après chaque groupe.

1. Une fois : la clé `~/.ssh/bic_gouv_ai` est autorisée pour le compte `voices` du serveur, et l'adresse du serveur est déjà connue de l'ordinateur (première connexion faite à la main).
2. Lancez la commande avec deux réglages :

```
VOICES_SSH_HOST=voices@<adresse du serveur> VOICES_SSH_KEY=~/.ssh/bic_gouv_ai pnpm --filter @bgs/api voices:record --lang wo --limit 50
```

- En wolof, un seul article par envoi : si la connexion coupe, on ne perd qu'une lecture d'environ 20 minutes.
- La collecte peut continuer pendant l'enregistrement : chaque écriture du fichier des articles se fait sous un verrou (`.data/news.json.write.lock`), si bien qu'aucune modification ne se perd quand deux programmes écrivent en même temps.

## Dans l'app

- **Avec un enregistrement** : le bouton « Écouter » lit le fichier, avec pause et reprise.
- **Sans enregistrement** : il reprend la voix du téléphone en français. En wolof, il affiche « Voix wolof bientôt disponible ».
- La lecture des fichiers demande le module audio de l'app : il faut une **nouvelle compilation** de l'app installée.
