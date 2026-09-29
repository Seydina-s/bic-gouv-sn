# Sécurité des secrets

Décision de l'utilisateur du 29/09/2026 (SEC-05) : Bic Gouv SN est un projet national. Personne ne doit pouvoir retrouver une clé du service, ni une personne, ni un outil, ni une intelligence artificielle, même très compétente en intrusion.

Aucune protection n'est absolue. L'objectif réaliste est double :

- aucune clé n'est **lisible** là où un attaquant ou un outil pourrait regarder ;
- une clé exposée se **remplace en quelques minutes**, sans rien casser.

## Les secrets du service

| Secret | Rôle | Où il vit |
|---|---|---|
| `ADMIN_SECRET_KEY` | Chiffre les secrets du second code des comptes de la console | Développement : `apps/api/.env.local`. Production : coffre de secrets |
| `ADMIN_SECRET_KEYS_PREVIOUS` | Anciennes clés, gardées seulement pendant un changement de clé | Même endroit, puis supprimées |
| `SENTRY_AUTH_TOKEN` | Envoi des cartes de débogage à Sentry | Secrets GitHub et EAS, jamais sur une machine |
| Mots de passe de la console | Connexion de l'équipe | Nulle part : seule une empreinte (scrypt) est gardée |

## Les protections en place

1. **Jamais dans le code.** Le scanner gitleaks refuse tout commit qui contient un secret, en CI et avant chaque poussée. Les fichiers de secrets sont ignorés par git.
2. **Jamais affichés.** Les outils de développement, y compris l'IA qui aide à écrire le code, ne peuvent pas lire les fichiers de secrets :
   - lecture et modification refusées par les règles de `.claude/settings.json` ;
   - toute commande qui les lirait, qui afficherait les variables d'environnement ou qui lancerait gitleaks sans masquage est refusée par `.claude/hooks/shell-guard.mjs`, testée à chaque contrôle (`pnpm test:hooks`).
3. **Jamais dans les journaux.** Les journaux de l'API masquent les en-têtes d'autorisation et les cookies ; les commandes n'affichent que l'**empreinte** d'une clé (8 caractères, qui ne permettent pas de la retrouver).
4. **Remplaçables à tout moment.** Chaque valeur chiffrée porte l'empreinte de sa clé. Une nouvelle clé chiffre, les anciennes déchiffrent encore le temps de tout rechiffrer, puis elles sont retirées. Chaque changement est inscrit au journal d'audit.
5. **Chiffrement solide.** AES-256-GCM, une valeur aléatoire nouvelle à chaque chiffrement ; une valeur modifiée est refusée.

## En production (avant la mise en ligne)

- La clé est **générée dans le coffre de secrets de l'hébergeur**, jamais sur un ordinateur, et n'est jamais recopiée.
- Elle est **fournie au serveur au démarrage, en mémoire seulement**. Elle n'est jamais écrite dans l'image du conteneur, un fichier, un journal ou la CI.
- **Seul le service de l'API** peut la lire (droit d'accès minimal) ; chaque lecture est journalisée par le coffre.
- Mieux encore, dès que l'hébergement le permet : une **clé non exportable** gardée dans un module matériel (HSM/KMS). L'API lui demande de chiffrer ou de déchiffrer, mais la clé elle-même ne sort jamais du module. Même un serveur entièrement compromis ne permettrait pas de la copier.
- La clé est changée **au moindre doute**, et au moins une fois par an.

## Procédures

### Changer la clé sur une machine de développement

1. Arrêter l'API.
2. `pnpm --filter @bgs/api admin:rotate-key` : crée une nouvelle clé, rechiffre les secrets et retire l'ancienne clé. N'affiche que des empreintes.
3. Redémarrer l'API. Personne n'a rien à refaire : les comptes gardent leur second code.

### Changer la clé en production

1. Créer la nouvelle clé dans le coffre de secrets. Le serveur reçoit la nouvelle clé dans `ADMIN_SECRET_KEY` et l'ancienne dans `ADMIN_SECRET_KEYS_PREVIOUS`.
2. Redémarrer l'API, puis lancer `pnpm --filter @bgs/api admin:reseal` avec ces mêmes variables.
3. Si la commande ne signale aucun secret illisible, retirer l'ancienne clé du coffre et redémarrer.

### Si une clé a été exposée

Changer la clé tout de suite (procédures ci-dessus), consigner l'incident dans `ERREURS.md` et vérifier le journal d'audit : connexions inhabituelles, secondes tentatives. Précédent : le 29/09/2026, la clé de développement est apparue dans une conversation avec l'IA. Elle a été remplacée le jour même, sans conséquence.
