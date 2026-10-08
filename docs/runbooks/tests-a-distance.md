# Faire tester l'app à distance (avant l'hébergement)

**Quand ?** Une personne doit essayer l'app depuis chez elle, sur Android, alors que le serveur tourne encore sur l'ordinateur de développement. L'hébergement (point 27) remplacera tout cela.

**Comment ça marche** : l'app Android de test (profil « preview », un APK autonome) parle à l'adresse fixe `https://coat-footprint-triceps.ngrok-free.dev`. ngrok relaie cette adresse jusqu'à un **filtre** (`scripts/public-gate.mjs`) qui ne laisse passer que ce que l'app demande (articles, démarches, services, carte, photos, messages de Participer) ; la console, la documentation de l'API et les pages d'état répondent « introuvable ». Le filtre sert aussi les photos, à la place du CDN.

## Relancer après un redémarrage de l'ordinateur

1. L'API, avec l'adresse publique des photos (sans laquelle les notifications partent sans photo) :
   `PORT=3100 PUSH_PROVIDER=expo TRUST_PROXY=1 MEDIA_BASE_URL=https://coat-footprint-triceps.ngrok-free.dev/media pnpm --filter @bgs/api start`
2. Le filtre : `node scripts/public-gate.mjs 3200 3100 .data/media`
3. Le tunnel : `C:\Users\HP\tools\ngrok\ngrok.exe http --url=https://coat-footprint-triceps.ngrok-free.dev 3200`

L'adresse ne change pas : l'app installée chez la personne continue de fonctionner, sans nouvelle compilation.

## Relancer après chaque fusion qui touche l'API

L'API en marche garde la version avec laquelle elle a démarré. Après une fusion, il faut la relancer, sinon la console signale « Une adresse inexistante de l'API a été demandée » pour toute nouvelle page (erreur du 08/10).

1. Arrêtez l'API et le filtre.
2. Mettez le dépôt à jour : `git fetch origin && git checkout --detach origin/main`.
3. Reconstruisez : `pnpm --filter @bgs/api build`.
4. Relancez les étapes 1 et 2 ci-dessus. Le filtre se lance toujours depuis `scripts/` du dépôt, jamais depuis une copie : la liste des adresses qu'il laisse passer change avec l'app.

Une clé saisie ou changée dans le fichier de configuration local de l'API n'est lue qu'au démarrage : relancez aussi l'API dans ce cas.

## Nouvelle version Android pour les testeurs

`npx eas-cli build --profile preview --platform android` (dans `apps/mobile`). L'adresse de l'API vient de la variable `EXPO_PUBLIC_API_URL` de l'environnement « preview » chez Expo (`eas env:list preview`).

## À savoir

- L'ordinateur doit rester allumé et connecté pendant les tests.
- Le code d'accès ngrok est un secret : il est enregistré sur l'ordinateur par son propriétaire (`ngrok config add-authtoken`) et ne se partage jamais.
- Les tunnels rapides de Cloudflare (adresse en `trycloudflare.com`) ne conviennent pas : leur adresse disparaît à la première coupure (ERREURS.md, 06/10/2026).
