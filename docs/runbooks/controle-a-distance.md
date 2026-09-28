# Contrôle à distance : couper une fonction, exiger une mise à jour

Depuis la console, page **Contrôle à distance** (compte administrateur), sans publier de nouvelle version de l'app.

## Couper une fonction qui pose problème

1. Décocher la fonction : Près de moi, Carte de « Près de moi », Écouter, Démarches.
2. **Enregistrer**. Les téléphones appliquent le changement en une minute environ, dès qu'ils sont en ligne.
3. Dans l'app, la fonction coupée disparaît ou affiche « Momentanément indisponible » ; le reste fonctionne normalement.
4. Une fois le problème réglé, recocher et enregistrer.

Chaque changement est inscrit au journal d'audit (qui, quand, ce qui est coupé).

## Exiger une mise à jour

Saisir la **version minimale** (trois nombres, par exemple `1.2.0`) : les apps plus anciennes affichent « Une nouvelle version est nécessaire » à la place de tout le reste. À n'utiliser que lorsque la nouvelle version est déjà disponible dans les magasins d'applications. Laisser vide pour n'en exiger aucune.

## Principe de sûreté

Une app qui ne peut pas lire ces réglages (hors ligne, serveur en panne) garde les derniers qu'elle a reçus ; avant d'en avoir reçu, tout est activé. Une panne du serveur ne coupe donc jamais rien.

## Détails techniques

- Réglages publics : `GET /v1/remote-config` (mis en cache 60 s) ; modification : `PUT /admin/v1/remote-config` (rôle administrateur).
- Fichier `.data/remote-config.json` (`REMOTE_CONFIG_PATH`) ; absent : tout est activé. Un fichier illisible est refusé (erreur signalée dans le journal des erreurs) plutôt que remplacé par « tout activé », qui rallumerait une fonction coupée volontairement.
