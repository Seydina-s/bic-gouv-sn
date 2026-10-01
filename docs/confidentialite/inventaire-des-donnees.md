# Inventaire des données de Bic Gouv SN

État au 01/10/2026 (mis à jour à 18 h), relevé dans le code. Ce document **n'est pas** la politique de confidentialité : c'en est la base factuelle. La politique, texte juridique, doit être rédigée et relue par un juriste. Elle est exigée par les stores (Google Play, App Store) et pour la déclaration à la CDP (loi n° 2008-12). Toute évolution du code qui touche à ces données met ce document à jour.

## Principes appliqués

- **Pas de compte** pour les citoyens.
- La **position** reste sur le téléphone : les distances sont calculées sur l'appareil.
- Statistiques **anonymes**, sur accord explicite, désactivées par défaut.
- Notifications, localisation et statistiques **sur accord explicite**, proposées une fois chacune à l'arrivée sur l'accueil, le « non » toujours visible.
- Journaux du serveur réduits au **minimum** : ni adresse IP, ni recherche, ni zone de carte consultée.

## 1. Sur le téléphone (jamais envoyé)

| Donnée | Pourquoi | Durée |
|---|---|---|
| Langue, thème, économie de données | Réglages | Jusqu'à leur changement ou la désinstallation |
| Articles favoris, dernier article ouvert | Fonctions de l'app | Idem |
| Articles et fiches déjà chargés | Lecture hors ligne | Cache renouvelé à l'usage |
| Quartiers de carte gardés hors ligne | Carte sans réseau | Jusqu'à leur suppression |
| Position, seulement si la personne l'a autorisée : proposée une fois à l'arrivée sur l'accueil (décision de l'utilisateur du 01/10/2026), ou plus tard par « Utiliser ma position » ou les Réglages ; une fois autorisée, obtenue à chaque ouverture de l'app | Services les plus proches | En mémoire pendant l'utilisation ; jamais enregistrée ni envoyée |
| Choix des statistiques et mémoire des jours déjà signalés | Ne pas compter deux fois | Effacée si la personne refuse |
| Choix des notifications, heures calmes, rubriques, jeton de notification | Notifications | Jusqu'à leur arrêt |
| Présentation déjà vue | Ne pas la remontrer | Jusqu'à « Redémarrer » |

## 2. Envoyé à notre serveur

| Donnée | Quand | Ce qui est gardé | Durée |
|---|---|---|---|
| Demandes de contenu (articles, démarches, services, carte) | À l'usage | Rien de nominatif. Le journal note la méthode et le chemin, sans IP ni paramètres ; la carte n'y est pas inscrite du tout | Selon l'hébergeur (à fixer) |
| Mots cherchés sans résultat | Recherche sans réponse | Le texte et le jour, seulement s'il a été cherché au moins 3 fois ; rien sur la personne | Les 2 000 recherches les plus fréquentes |
| Signaux d'usage (statistiques) | Seulement après accord | Des totaux par jour (personnes actives, plateformes, versions, articles lus) ; aucun identifiant | 400 jours |
| Abonnement aux notifications | Seulement après accord | Le jeton de notification du téléphone, les rubriques, les heures calmes, la langue, et l'heure du premier abonnement (à l'heure près, pour repérer un afflux de faux abonnements) | Jusqu'au désabonnement, ou jusqu'à ce qu'Expo signale le téléphone comme inconnu |
| Messages au gouvernement et signalements (Participer) | Quand la personne les envoie | Le texte, le sujet ou le type de problème, le lieu s'il est écrit (quartier, commune ; jamais une position), la langue, le jour et l'heure de réception ; la photo d'un signalement, redressée, réduite et **sans ses données cachées** (lieu de prise de vue, appareil), gardée dans un dossier privé, visible seulement dans la console ; **rien sur l'expéditeur** | Un an, puis effacés avec leur photo |
| Adresse IP | Chaque requête | Seulement en mémoire, pour limiter le débit (fenêtre d'une minute) ; jamais écrite dans les journaux | Une minute |

## 3. Services tiers

| Service | Ce qu'il reçoit | Quand |
|---|---|---|
| Expo (650 Industries, États-Unis), puis Apple (APNs) ou Google (FCM) | Le jeton de notification et le message (titre, premiers mots, photo de l'article) | Pour chaque notification, si la personne les a acceptées |
| Google Maps | La position du **service** choisi, jamais celle de la personne. L'app Google Maps obtient ensuite la position de la personne selon ses propres réglages | Quand la personne touche « Itinéraire » |
| presidence.sn, e-senegal.sn | L'ouverture de la page d'origine | Quand la personne touche le lien de la source |
| Sentry (si activé) | Rapports de plantage techniques | En cas d'erreur. Stockage des IP à désactiver côté Sentry (MON-01) |
| Hébergeur et CDN (à choisir) | Les requêtes ci-dessus | Journaux à configurer sans IP ni zone de carte (MAP-10) |

## 4. Console d'administration (l'équipe)

| Donnée | Ce qui est gardé | Durée |
|---|---|---|
| Comptes | Nom, adresse e-mail, rôle, empreinte du mot de passe (scrypt), secret du second code chiffré | Tant que le compte existe |
| Sessions | Empreinte du jeton de session (mémoire ou Redis) | Durée de la session |
| Journal d'audit | Qui a fait quoi, quand, sur quoi (identifiant du compte, action, cible) ; jamais d'IP ; ne peut être ni modifié ni effacé | Permanent (exigence d'audit) |
| Tentatives de connexion sur une adresse inconnue | Empreinte de l'adresse e-mail et nombre d'essais | 24 heures |

## Points ouverts (à décider)

1. Durée de conservation des journaux chez l'hébergeur.
2. Désactivation du stockage des IP chez Sentry (MON-01).
3. Rédaction de la politique de confidentialité par un juriste, sur la base de ce document.
4. Déclaration du traitement à la CDP, notamment pour les notifications, Participer (textes libres et photos, qui peuvent contenir des données personnelles malgré la consigne d'anonymat) et, plus tard, l'IA.
5. Durée de conservation de Participer (un an, choix autonome à confirmer).
