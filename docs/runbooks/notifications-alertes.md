# Procédure — Les notifications signalent une alerte

Alertes concernées, en rouge dans la console, page « Notifications » :
- **rafale d'annonces automatiques** : « N articles annoncés automatiquement en 30 minutes » (dès 3) ;
- **afflux d'abonnements** : « N téléphones se sont abonnés en 24 heures, bien plus que d'habitude » (dès 500, et plus de 5 fois le rythme de la semaine d'avant).

## Rafale d'annonces automatiques

### Ce qui se passe tout seul
- Chaque nouvel article de presidence.sn est annoncé une seule fois, hors heures calmes de chacun.
- Jamais plus de **10 annonces par heure** : au-delà, les suivantes attendent, et un article reçu depuis plus de 30 minutes n'est plus annoncé.
- Un article mis en quarantaine (mal formé) n'est jamais annoncé.

### Que faire
1. Ouvrir les derniers articles annoncés (historique de la page « Notifications ») et vérifier sur https://www.presidence.sn/fr/ qu'ils y sont bien publiés.
2. **Au moindre doute, mettre en pause** (bouton « Mettre en pause ») : tout éditeur peut le faire, l'effet est immédiat. Les articles publiés pendant la pause ne seront pas annoncés plus tard.
3. Si les articles sont faux, ou si le site de la Présidence semble piraté : prévenir l'équipe technique et le BIC. La pause reste en place.
4. Si tout est normal (journée chargée, Conseil des ministres) : un **administrateur** reprend l'envoi (bouton « Reprendre l'envoi automatique »).

Chaque pause et chaque reprise sont inscrites au journal d'audit.

## Afflux d'abonnements

### Pourquoi c'est surveillé
L'inscription aux notifications se fait sans compte : n'importe qui peut envoyer de faux abonnements, au plus 10 par minute depuis une même adresse. De faux abonnements ralentissent les envois, sans rien révéler sur personne.

### Ce qui se passe tout seul
Au premier envoi, le service d'Expo signale les faux jetons comme inconnus, et l'API les **oublie** aussitôt.

### Que faire
1. Chercher une explication normale : lancement de l'app, annonce importante, article très partagé, campagne de communication. Si elle existe, rien à faire.
2. Sinon, prévenir l'équipe technique avec la date et les chiffres affichés. Elle peut durcir la limite d'inscription ou bloquer une origine au niveau du pare-feu (WAF).
3. Les seuils sont provisoires : à ajuster quand l'app aura de vrais chiffres (décision du 01/10/2026).
