# Infrastructure

Trois conteneurs, prêts pour n'importe quel hébergeur. Le choix de l'hébergeur (S1-02) est en attente du budget.

| Image | Rôle | Port |
|---|---|---|
| `infra/docker/api.Dockerfile` | API publique et API de la console | 3000 |
| `infra/docker/console.Dockerfile` | Centre d'administration (Next.js) | 3001 |
| `infra/docker/ingestion.Dockerfile` | Collecte en temps réel de presidence.sn : **une seule instance** | — |

- **Données** : un volume monté sur `/app/.data`, commun à l'API et à la collecte, sauvegardé chaque jour (voir `docs/runbooks/restaurer-les-donnees.md`).
- **Secrets** : jamais dans une image. Ils sont fournis au démarrage par le coffre de secrets de l'hébergeur (`docs/securite-des-secrets.md`). Les images sont construites sans aucun fichier `.env` ni donnée (`.dockerignore`), ce que la CI vérifie.
- **Sécurité** : les processus tournent sans droits d'administrateur. Chaque image a un contrôle de santé.
- **Vérification** : la CI construit les trois images à chaque modification, puis démarre l'API et la console et vérifie qu'elles répondent (tâche « Container images »).

Essai local, si Docker est installé :

```sh
ADMIN_SECRET_KEY=… docker compose -f infra/docker/compose.yaml up --build
```

La clé se génère sans jamais s'afficher (`pnpm --filter @bgs/api admin:rotate-key` en développement).

À faire avec l'hébergement : registre d'images, CDN devant l'API et les tuiles, WAF, sauvegardes hors machine, PostgreSQL à la place des fichiers.
