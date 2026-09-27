# Installer la version de test de l'app sur votre iPhone

La carte de « Près de moi » utilise un module natif (MapLibre) qui n'existe pas dans Expo Go. Pour la voir, il faut une **version de développement** de Bic Gouv SN : une app compilée pour vous, installée une seule fois sur votre iPhone. Ensuite, comme Expo Go, elle charge le code depuis l'ordinateur : il n'y a pas besoin de la réinstaller à chaque modification (sauf si un nouveau module natif est ajouté).

En attendant, Expo Go reste utilisable : « Près de moi » y affiche la liste des services, sans la carte.

## Ce qu'il faut, une seule fois

| Élément | Coût | Pourquoi |
|---|---|---|
| Compte **Apple Developer** (programme développeur d'Apple) | **99 USD par an : à valider par vous avant toute inscription** | Apple n'autorise l'installation d'une app de test sur un iPhone, depuis Windows, qu'avec ce compte. Il servira aussi plus tard pour publier l'app sur l'App Store. |
| Compte **Expo** (https://expo.dev/signup) | Gratuit | Les serveurs d'Expo compilent l'app (l'offre gratuite propose un nombre limité de compilations par mois, voir https://expo.dev/pricing). |
| L'iPhone et l'ordinateur sur **le même Wi-Fi** | — | Comme avec Expo Go. |

Sans compte Apple Developer, il n'existe pas de solution gratuite pour installer l'app sur un iPhone depuis Windows. Sur un téléphone **Android**, la version de test est gratuite (voir en bas de page).

## Étapes (environ 30 à 45 minutes, dont l'attente de la compilation)

Toutes les commandes se tapent dans un terminal ouvert dans le dossier du projet. Je peux les lancer avec vous, **sauf les connexions à vos comptes** : vous tapez vous-même vos mots de passe, ils ne doivent jamais m'être donnés.

1. **Se placer dans le dossier de l'app**
   ```
   cd apps/mobile
   ```
2. **Se connecter à votre compte Expo**
   ```
   npx eas-cli login
   ```
3. **Enregistrer votre iPhone**
   ```
   npx eas-cli device:create
   ```
   Choisissez « Website », ouvrez le lien (ou le QR code) **sur l'iPhone**, puis installez le profil proposé (Réglages → Profil téléchargé → Installer).
4. **Lancer la compilation**
   ```
   npx eas-cli build --profile development --platform ios
   ```
   Au premier lancement, l'outil pose quelques questions :
   - relier le projet à votre compte Expo : répondez **oui** (cela ajoute l'identifiant du projet dans `app.json`, à garder) ;
   - l'identifiant de l'app (« bundle identifier ») : acceptez la proposition. C'est un **identifiant de test** ; l'identifiant officiel sera choisi avec le BIC avant toute publication (backlog A-02) ;
   - la connexion à votre compte Apple Developer : Expo crée alors lui-même les certificats nécessaires.

   La compilation se fait sur les serveurs d'Expo. Selon l'attente, cela prend de quelques minutes à plus d'une demi-heure.
5. **Installer l'app** : à la fin, l'outil affiche un lien et un QR code. Ouvrez-le **sur l'iPhone** et installez « Bic Gouv SN ».
6. **Si l'iPhone refuse d'ouvrir l'app** : Réglages → Confidentialité et sécurité → **Mode développeur** → activer, puis redémarrer l'iPhone et confirmer.

## Utiliser la version de test

1. Sur l'ordinateur, le serveur de développement doit tourner, pointé vers l'API locale. Dans PowerShell :
   ```
   cd apps/mobile
   $env:EXPO_PUBLIC_API_URL="http://ADRESSE-DE-L-ORDINATEUR:3100"; npx expo start --dev-client
   ```
   (Je le lance pour vous si vous me le demandez. L'API locale doit être une version qui connaît la carte, construite après le 27/09/2026.)
2. Ouvrez l'app de test sur l'iPhone : elle affiche les serveurs de développement trouvés sur le Wi-Fi. Touchez celui de l'ordinateur, ou saisissez son adresse (`http://ADRESSE-DE-L-ORDINATEUR:8081`).
3. Acceptez l'accès au réseau local quand l'iPhone le demande.
4. Onglet **Près de moi** → bouton **Carte** en bas de l'écran.

## Ce qu'il faut savoir

- **Votre position reste sur le téléphone** : l'app ne l'envoie jamais. Le fond de carte vient de notre propre serveur, qui ne garde pas trace des zones consultées.
- La carte ne montre que les **services vérifiés** dans la console.
- Une nouvelle compilation n'est nécessaire que si un module natif est ajouté ou mis à jour. Je vous le signalerai à chaque fois.
- Pour continuer avec **Expo Go** (sans la carte), le serveur se lance avec `npx expo start --go` : sans cette option, il vise désormais la version de test.

## Sur un téléphone Android (gratuit)

Mêmes étapes 1, 2 et 4, sans enregistrement de l'appareil ni compte Apple :
```
npx eas-cli build --profile development --platform android
```
À la fin, ouvrez le lien sur le téléphone Android et installez le fichier proposé (autorisez l'installation depuis le navigateur si Android le demande).
