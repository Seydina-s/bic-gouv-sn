# Statistiques anonymes

Décision de l'utilisateur du 29/09/2026 (ADM-12) : les tableaux de bord de la console reposent sur des **compteurs agrégés et anonymes**, sans identifiant de personne ni de téléphone. Ce document dit exactement ce qui est mesuré. Il répond aux exigences de la loi sénégalaise n° 2008-12, de la CDP, et du RGPD pris comme référence.

## Consentement

- **Désactivé par défaut.** Rien ne part du téléphone tant que la personne n'a pas choisi « Oui » dans les Réglages (« Statistiques anonymes »).
- La personne peut revenir sur son choix à tout moment. En choisissant « Non », tout ce que le téléphone gardait pour les statistiques est effacé.

## Ce qui est envoyé, et seulement cela

| Signal | Quand | Contenu |
|---|---|---|
| « Actif aujourd'hui » | Au plus une fois par jour, à l'ouverture de l'app | Premier signal de la semaine ? du mois ? tout premier ? Retour après exactement 1, 7 ou 30 jours ? Système (Android, iOS), numéro principal de sa version (ex. 14), version de l'app |
| « Article lu » | Quand la personne ouvre un article | L'identifiant de l'article officiel |
| « Article écouté » | Quand la personne lance « Écouter » | L'identifiant de l'article officiel |

Le serveur compte chaque signal pour le jour où il le reçoit, puis l'oublie. Il ne garde pas l'adresse de l'envoi, et le contenu des signaux n'est jamais écrit dans les journaux. Il refuse tout champ en trop.

Seuls des totaux sont gardés : un nombre par jour et par mesure (par exemple « 12 personnes actives sur Android le 29/09 »), jamais un signal isolé. Avec PostgreSQL (`DATABASE_URL`), chaque serveur ajoute ses totaux à ceux des autres toutes les 30 secondes ; sans base, ils sont gardés dans un fichier. Les jours de plus de 400 jours sont effacés.

## Ce qui n'est jamais mesuré

- Aucun identifiant : ni compte, ni numéro de téléphone, ni identifiant publicitaire ou d'appareil, ni adresse IP conservée.
- Aucune position, et donc aucune région : la localisation reste sur le téléphone.
- Aucun parcours individuel : impossible de relier deux signaux à la même personne.
- Aucun modèle de téléphone ni opérateur.

## Ce que le téléphone garde pour ne pas envoyer deux fois

Seulement des dates au jour près : premier jour, dernier jour, dernière semaine, dernier mois. Aucune heure. Elles sont effacées quand la personne choisit « Non ».

## Ce que voit la console (tous les rôles)

Des totaux : personnes actives (jour, veille, semaine, mois), nouvelles personnes (7 et 30 jours), part des nouvelles personnes revenues après 1, 7 et 30 jours, systèmes et versions, articles les plus lus et écoutés.

Ce sont des chiffres **minimaux** : seules les personnes qui ont accepté sont comptées. Le nombre exact d'installations se lit dans les consoles de Google Play et de l'App Store.

## Limites connues

- N'importe qui pourrait envoyer de faux signaux pour gonfler un chiffre. L'API limite le débit, et en production le WAF filtrera. Ces chiffres guident des décisions ; ils ne servent jamais de preuve.
- En production, les articles seront servis par un CDN : le compte des lectures vient de l'app, pas des journaux du serveur, et reste donc exact.
