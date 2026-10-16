# Relire l'application en wolof

Depuis le 16/10/2026 (décision de l'utilisateur), l'interface existe en wolof en **traduction automatique**, signalée comme telle dans l'application (Réglages et présentation). Elle attend la relecture de locuteurs natifs (W-01).

## Le fichier à relire

`wolof-a-relire.csv` contient chaque texte de l'application : sa clé, le texte français, le wolof affiché aujourd'hui et une colonne « Correction » vide. Il s'ouvre dans Excel, LibreOffice ou Google Sheets.

- Lisez le wolof actuel. S'il convient, laissez « Correction » vide ; sinon, écrivez-y le bon texte. Ne touchez pas à la clé.
- Ce qui est entre accolades, comme `{count}` ou `{source}`, doit rester tel quel : l'application y met un nombre ou un nom.
- Une ligne « nombre variable » sert pour un ou plusieurs éléments : le wolof n'en a qu'une forme.
- Les noms officiels des ministères restent en français, faute de forme wolof officielle.
- Gardez des phrases courtes : elles s'affichent sur des petits écrans.
- Les lettres wolof (ë, é, à, ó, ñ, ŋ) sont prises en charge par les polices de l'application.

## Ensuite

Le fichier relu revient à l'équipe technique, qui intègre les corrections. Une fois tout relu, la mention « traduction automatique » de l'interface est retirée.

## Mettre le fichier à jour

Après l'ajout ou la correction de textes : `pnpm i18n:wolof`.
