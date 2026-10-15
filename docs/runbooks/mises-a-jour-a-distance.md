# Mises à jour à distance de l'app (EAS Update)

La version Android de test (profil `preview`) se met à jour seule : à chaque ouverture, elle vérifie s'il existe une nouvelle version du code de l'app, la télécharge en arrière-plan et l'applique à l'ouverture suivante. Service gratuit d'Expo jusqu'à 1 000 utilisateurs actifs par mois.

## Publier une mise à jour

Depuis `apps/mobile`, une fois les changements fusionnés dans `main` :

```sh
npx eas-cli@latest update --channel preview --environment preview --platform android --message "<ce qui change, en une ligne>"
```

L'adresse de l'API vient de l'environnement `preview` d'EAS, comme pour la compilation.

## La règle de version (importante)

Une mise à jour à distance ne remplace que le code JavaScript. Elle n'arrive que sur les applications installées dont le **numéro de compatibilité** est le même : ici, la version de l'app (`expo.version` dans `app.json`, réglage `runtimeVersion: { policy: "appVersion" }`).

- Changement de code seulement (écrans, textes, logique) : **ne pas toucher** à la version, publier une mise à jour.
- Ajout, retrait ou mise à niveau d'un **module natif** (tout paquet avec du code Android ou iOS, une extension Expo `app.plugin`, ou un réglage natif de `app.json`) : **augmenter la version** (1.0.0 → 1.1.0), puis faire une **nouvelle compilation** et la faire installer. Sans cela, une mise à jour pourrait appeler un module absent de l'app installée et la faire planter.

Le code qui utilise un module natif récent vérifie qu'il est présent (`requireOptionalNativeModule`) : une version plus ancienne garde un comportement de repli au lieu de planter.

## Pourquoi pas l'empreinte automatique

Le réglage `fingerprint` (empreinte calculée du projet) a été essayé le 15/10/2026 : avec pnpm, les chemins des modules diffèrent entre l'ordinateur et les serveurs d'Expo, et la compilation échoue (« Runtime version mismatch »). La version explicite est plus simple et stable.
