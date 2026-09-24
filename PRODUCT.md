# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

L'application citoyenne est native (React Native / Expo) sur Android et iOS, et respecte les conventions de chaque système. Le centre d'administration (`apps/admin`) est une application **web**, utilisée sur ordinateur de bureau et portable.

## Users

- **Citoyens sénégalais**, au Sénégal et dans la diaspora, jeunes comme âgés, lettrés ou peu à l'aise avec la lecture. Ils utilisent surtout des Android d'entrée et de milieu de gamme, avec un réseau parfois lent (3G) ou instable. Ce qu'ils viennent faire : s'informer de l'action gouvernementale, trouver le service de l'État le plus proche, comprendre une démarche.
- **Équipe du centre d'administration** (BIC), sans profil technique obligatoire, sur ordinateur de bureau ou portable :
  - **équipe communication** : contenus publiés, notifications, traductions à relire ;
  - **responsables et direction** : tableaux de bord, validation à deux personnes des envois nationaux ;
  - **équipe technique** : santé du système, erreurs expliquées en français simple.

## Product Purpose

Être le compagnon numérique du citoyen : l'actualité gouvernementale officielle en temps réel (Conseil des ministres, communiqués, discours, visites), la carte des services de l'État et les démarches administratives. Tout est disponible en français et en wolof, à l'écrit comme à l'oral. Le succès se mesure ainsi : une app de référence nationale, rapide, fiable et agréable sur n'importe quel téléphone, pour des millions d'utilisateurs.

## Positioning

- Un projet porté par le Bureau d'Information et de Communication du Gouvernement (BIC) lui-même ; l'autorisation officielle de la Présidence est attendue.
- Des contenus repris uniquement des sources officielles (presidence.sn FR et WO, e-senegal.sn), identiques à la source et traçables jusqu'à elle.
- Le wolof officiel de presidence.sn, jamais retraduit. L'audio partout, pour les personnes qui lisent peu.

## Operating Context

- Les pics de trafic suivent la publication du compte rendu du Conseil des ministres.
- Ingestion automatique : aucune publication manuelle de contenu.
- L'administration sert à surveiller (ingestion, disponibilité, erreurs), gérer (services de la carte, notifications, feature flags, relecture des traductions) et décider (tableaux de bord). Le journal des erreurs est rédigé pour être compris en quelques secondes par une personne non technique.

## Capabilities and Constraints

- Référence : CLAUDE.md, section 1 (périmètre P0/P1/P2, objectifs chiffrés, contraintes légales).
- Pas de compte citoyen ; données personnelles minimisées (loi sénégalaise n° 2008-12, CDP, RGPD comme référence).
- Ce n'est ni un média d'opinion, ni un portail transactionnel, ni un chatbot généraliste, ni un réseau social, ni une carte généraliste.
- Admin : 2FA obligatoire, rôles (RBAC), journal d'audit immuable.
- Points ouverts : autorisation écrite de la Présidence (L-01), identifiant de publication de l'app (A-02), rédacteurs et relecteurs du wolof de l'interface (W-01).

## Brand Commitments

- Couleurs du drapeau : vert `#00853F` (dominant), jaune `#FDEF42` (accent, jamais en texte sur blanc), rouge `#E31B23` (alertes, avec parcimonie), blanc.
- Motif baobab en traits fins, en filigrane (3 à 6 % d'opacité) : splash, onboarding, en-têtes clés, états vides.
- Aucune identité visuelle officielle du BIC ou du Gouvernement n'est connue à ce jour. Ne jamais imiter un emblème, des armoiries ou un logo officiels.
- Ton : court, direct, respectueux, vouvoiement en français.

## Evidence on Hand

- Maquette de référence : https://claude.ai/artifact/5zUwikPMetvGGHynB18nDB (source d'inspiration, pas une contrainte).
- Aucun logo officiel, aucune photo, aucun témoignage ni aucun chiffre d'usage pour l'instant : ne rien fabriquer, utiliser des emplacements explicitement signalés comme provisoires.

## Product Principles

1. L'exactitude avant tout : rien n'est affiché sans source officielle, rien n'est deviné.
2. Rapide et fiable sur un téléphone modeste en 3G : cache d'abord, jamais d'écran blanc.
3. Le minimum de texte, le maximum de clarté : trois gestes au plus vers toute information clé.
4. Français et wolof à égalité, à l'écrit comme à l'oral.
5. Un service public : aucun dark pattern, respect absolu de l'utilisateur.

## Accessibility & Inclusion

WCAG 2.2 AA dans les deux thèmes, lecteurs d'écran, cibles tactiles ≥ 48 dp, respect de la taille de police du système et du réglage « réduire les animations », audio comme alternative au texte partout.
