# Politique de sécurité — Bic Gouv SN

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir de ticket public pour une faille de sécurité.

Utilisez le signalement privé de GitHub : onglet **Security** du dépôt → **Report a vulnerability**. Seuls les responsables du projet voient le rapport.

Indiquez si possible :

- la partie concernée (application mobile, API, centre d'administration, collecte des contenus) ;
- les étapes pour reproduire le problème ;
- l'impact estimé.

Nous accusons réception sous 5 jours ouvrés et vous tenons informé de la correction. Merci de laisser le temps de corriger avant toute publication.

## Périmètre

- Code de ce dépôt (branche `main`).
- Hors périmètre : les sites sources officiels (presidence.sn, e-senegal.sn), qui ne sont pas gérés par ce projet.

## Ce que ce dépôt ne contient jamais

Aucun secret (clé, mot de passe, jeton) n'est versionné : ils vivent dans les variables d'environnement et les coffres de secrets. Chaque modification est analysée automatiquement (gitleaks, audit des dépendances) avant de pouvoir être fusionnée.
