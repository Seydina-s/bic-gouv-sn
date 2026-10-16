# Audit des bugs silencieux — 15/10/2026

Point de départ : deux lectures audio se superposaient quand on lançait l'écoute d'un
autre article. Ce type de défaut ne déclenche aucune erreur : il faut le chercher. Cet
audit passe en revue chaque fonctionnalité qui partage une ressource (le son, le
stockage du téléphone, le disque du serveur) ou qui réagit à un événement pouvant
arriver deux fois.

## Classes de risque et état

| Classe de risque | Où | Constat | État |
|---|---|---|---|
| Deux sons en même temps | Lecteur (articles, voix enregistrées, voix du téléphone) | Le nouveau son démarrait avant que l'ancien soit coupé | Corrigé : l'ancien est coupé et attendu avant tout nouveau départ (`PlayerProvider.tsx`, test `one-reading.test.tsx`) |
| Micro pendant une lecture | Dictée de l'assistant | La lecture continuait pendant la dictée | Corrigé : la lecture se met en pause avant d'écouter (`useVoiceInput.ts`) |
| Course au démarrage (stockage du téléphone) | Favoris, réglages, dernier article ouvert | Un choix fait avant la fin du chargement pouvait être écrasé par l'ancien | Corrigé : un choix récent n'est jamais remplacé par une lecture tardive (`usePersistentChoice.ts`, `FavoritesProvider.tsx`, `useLastOpened.ts`) |
| Listes écrites en dur qui divergent des données | Rubriques proposées (puces, panneau Filtrer, notifications) | « Actualités » manquait (les articles des ministères n'étaient jamais notifiés aux abonnés d'une rubrique) et « Agenda », vide, était proposé | Corrigé : seules les rubriques qui ont des articles sont proposées (`useOfferedSections.ts`) ; le choix des rubriques de notification est retiré, toutes les rubriques sont envoyées |
| Événement traité deux fois | Toucher une notification | Une même notification pouvait ouvrir l'article deux fois | Corrigé : chaque notification n'est ouverte qu'une fois (`useNotificationTaps.ts`) |
| Double ouverture | Vidéos et pages officielles dans le navigateur intégré | Deux appuis rapides ouvraient deux navigateurs | Corrigé : une seule ouverture à la fois (`open-video.ts`) |
| Double envoi | Participer (messages, signalements) | — | Déjà couvert par une clé d'idempotence |
| Travail lourd en arrière-plan | Accueil | La carte « Près de moi » était montée en arrière-plan (cause probable du blocage sur iPhone) | Corrigé le 15/10 (PERF-10) |
| Arrêt sans alerte côté serveur | Disque du serveur | Le disque plein a arrêté les voix dans la nuit sans rien signaler | Corrigé : l'espace libre est mesuré à chaque passage de la collecte et la console affiche une alerte rouge sous 5 Go |
| Écritures concurrentes de fichiers | Collecte, API | — | Déjà couvert : verrous d'écriture, une seule collecte à la fois, renommages réessayés |

## Règle retenue

Toute ressource partagée (son, micro, fichier, disque) a un seul propriétaire à la fois,
et tout gestionnaire d'événement externe (notification, appui, chargement tardif) doit
supporter d'être appelé deux fois ou en retard. Chaque nouvelle fonctionnalité qui
touche ces ressources est vérifiée contre ce tableau.
