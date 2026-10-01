# Traduire l'application en wolof

Aucun texte wolof n'est écrit par l'équipe technique ni par l'IA : il est rédigé et validé par des locuteurs natifs (W-01). En attendant, l'application affiche le français.

## Le fichier à remplir

`wolof-a-traduire.csv` contient chaque texte de l'application qui n'a pas encore de version wolof : sa clé, le texte français et une colonne « Wolof » vide. Il s'ouvre dans Excel, LibreOffice ou Google Sheets.

- Remplissez seulement la colonne « Wolof ». Ne touchez pas à la clé.
- Ce qui est entre accolades, comme `{count}` ou `{source}`, doit rester tel quel : l'application y met un nombre ou un nom.
- Une ligne marquée « pluriel » existe en deux formes (`one` pour 1, `other` pour plusieurs). Le wolof peut n'en utiliser qu'une : dans ce cas, mettez le même texte dans les deux.
- Gardez des phrases courtes : elles s'affichent sur des petits écrans.
- Les lettres wolof (ë, é, à, ó, ñ, ŋ) sont prises en charge par les polices de l'application.

## Ensuite

Le fichier rempli revient à l'équipe technique, qui l'intègre dans l'application. Une personne de l'équipe vérifie chaque écran en wolof avant la mise en ligne.

## Mettre le fichier à jour

Après l'ajout de nouveaux textes : `pnpm i18n:wolof`. Seuls les textes encore sans wolof sont listés.
