# Notifications push

CLAUDE.md §1 (FEED-04) : notifications par rubrique, **sur abonnement** et avec **heures calmes**. Une notification annonce toujours un article officiel, avec son titre. Deux personnes la valident dans la console (ADM-07).

## Ce que le serveur garde

Pour chaque téléphone abonné, seulement ce qu'il faut pour envoyer :
- le **jeton de notification** donné par le service d'Expo. C'est un identifiant de l'installation (donnée pseudonyme), jamais relié à une personne, un nom ou un numéro ;
- les **rubriques suivies** ;
- les **heures calmes** (par exemple 22 h – 7 h, heure de Dakar) ;
- la **langue**.

Rien d'autre. Un téléphone qui ne suit plus aucune rubrique est oublié. Un jeton qu'Expo déclare invalide (application désinstallée) est oublié à l'envoi suivant.

## Envoi

- Seulement après la validation par une seconde personne.
- Seulement aux téléphones qui suivent la rubrique de l'article.
- **Jamais pendant leurs heures calmes.** Rien n'est mis en attente : l'article est déjà dans l'application.
- Par le service gratuit d'Expo, qui transmet à Apple et à Google, par lots de 100, avec un délai maximal de 10 s par lot. Si le service ne répond pas, la console l'indique (« échec de l'envoi »).
- Désactivé tant que `PUSH_PROVIDER=expo` n'est pas configuré : la console enregistre alors les notifications validées sans rien envoyer.

## Ce qui reste à faire

L'écran de l'application : choisir ses rubriques et ses heures calmes, avec la permission demandée au moment où elle sert. Il arrivera avec la version de test (A-03). Le téléphone ne peut obtenir de jeton qu'avec l'identifiant de projet Expo, créé à ce moment-là.

À grande échelle, les abonnements passeront dans PostgreSQL (SCALE-01).
