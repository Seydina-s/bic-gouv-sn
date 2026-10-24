# Historique des sessions — Bic Gouv SN (archive : la reprise est dans STATUS.md ; ne lire ce fichier que pour un besoin précis)

**Dernière mise à jour** : 22/10/2026 (17 h) · **Mode** : autonome prolongé (demande du 22/10). Actions de l'utilisateur : `.claude/session/A-FAIRE-UTILISATEUR.md` (points 50, 52 à 55, 60, 66).

## 24/10, en bref : tournée Dependabot, accessibilité, modèle de méthode
- **Dépendances (#405, #281, #282, #280, #329)** : toutes les mises à jour mineures fusionnées ; #397 fermée en doublon. Leçons : verrou non mis à jour par Dependabot, branches réécrites par Dependabot pendant les contrôles, outil de contrôle mis à jour sans lancer ce contrôle (ERREURS.md, #409).
- **Accessibilité (QA-12)** : axe-core 4.14 rend bloquante la règle « nom = texte affiché » ; trois vrais défauts corrigés (carte d'article, carte « Voir plus », ligne de démarche), faux positifs d'axe écartés par un filtre étroit (decisions.md) ; mise à jour à distance publiée.
- **Outillage** : `ship.sh` durci ; garde du shell : scripts de démarrage interdits dans un tube (#410) ; `apps/admin/AGENTS.md` aligné sur Next.js 16.4 (#411) ; Metro de l'iPhone remis sur main.
- **Méthode** : modèle générique de prompt système pour tout nouveau projet livré sur le bureau de l'utilisateur (`CLAUDE-MODELE-PROJET.md`).

## 18 au 22/10, en bref : traduction automatique, trois voix, nettoyage
- **Traduction automatique (#399)** : la surveillance traduit seule chaque nouvel article en anglais et en wolof (toutes les 30 min ; fiches des démarches toutes les 6 h) ; `TRANSLATION_AUTO=off` l'arrête. Un article refusé deux fois pour la même version n'est plus renvoyé ; le compteur repart à chaque correction des contrôles (#401).
- **Refus récurrents examinés (ML-12d)** : deux articles contenaient des émojis Facebook collés comme images, refusés même en français (corrigé) ; deux communiqués de 2024 mis en page ligne par ligne restent en français (decisions.md).
- **Voix (#398)** : voix anglaise Kokoro af_heart installée et essayée sur le serveur ; phrases trop longues recoupées ; fichier occupé attendu au lieu d'arrêter le rattrapage. Chaîne relancée : français (≈ 220 restants), puis anglais, puis wolof (le wolof continuera sur le futur serveur d'hébergement).
- **App (#399, mise à jour à distance publiée)** : volet qui se ferme en rideau vers la droite ; rubriques en capitales complètes sur Android (« Interviews & reportages ») ; carrousel « à la une » qui reprend après un balayage.
- **Assistant** : premier passage automatique du banc (18/10) : 86 sur 92 ; chaque échec garde désormais les extraits donnés et la réponse brute (AST-39, #401). AST-30e (bouton « Signaler cette réponse ») attend la durée de conservation et la mention de confidentialité (point 66).
- **Nettoyage (22/10)** : 9 anciennes copies du dépôt, 54 branches locales déjà fusionnées, fichiers d'essais et copie corrompue de septembre dans `.data`, modèles de voix locaux (2,1 Go, les voix tournent sur le serveur), cloudflared (remplacé par ngrok), magasin pnpm élagué. Copies gardées : `-w2`, `-w4` (livraisons), `-ota`, `-demo` (Metro de l'iPhone).

## 17/10, après-midi et soir, en bref : traductions faites, assistant mesuré et amélioré
- **Traductions (≈ 101 $ en tout)** : articles depuis le 02/04/2024, environ 3 370 en anglais et 2 615 en wolof ; fiches des démarches, 714 en anglais et 711 en wolof ; tout en « traduction automatique ». Restent en français : 27 refus des contrôles et 4 articles wolof trop longs pour une réponse (ML-12c, à traduire par morceaux).
- **Défauts trouvés et corrigés en route** : collecte qui réécrivait 56 Mo par article (#379), réponses wolof écartées à tort après l'anglais (#380, relues sans surcoût), place trop courte pour le wolof long (#382), crédit Anthropic épuisé (rechargé par l'utilisateur, l'erreur affiche désormais le motif, #378).
- **Autres corrections** : section DER revenue (filtre public, #376) ; panneau « Près de moi » replié par un toucher en dehors (#376). La transition entre thèmes est en pause (décision de l'utilisateur).
- **Programme de l'assistant (`docs/cadrage/assistant-fiabilite.md`)** :
  - actualités d'une période (#377) ;
  - reformulation de chaque question (#384) ;
  - banc d'essai hebdomadaire avec faiblesses connues (#385, `pnpm --filter @bgs/api assistant:bench`, `--weaknesses` pour un contrôle rapide) ;
  - périmètre (#386) ;
  - aiguillage des démarches (#387) ;
  - banc plus juste et services sans adresse montrés sur la carte (#388) ;
  - lexique des mots courants et réponses partielles (#389).
  
  Premier banc : 71 sur 92 (77 %). Contrôle des faiblesses et pièges : 51 % → 64 % → 83 %, aucune réponse inventée, 12 faiblesses restantes.
- **Prochaines étapes** : AST-30f (lancement automatique chaque semaine et résultats dans la console) ; faiblesses restantes (visa Canada, Ankara, « c ki le premier ministre », liste des ministères) ; point 64 (relevé des questions sans réponse) à trancher par l'utilisateur.

## 17/10, nuit et matin, en bref : démarches dans la langue choisie
- **Livré et déployé** : #367 (lectures orphelines arrêtées sur le serveur des voix), #368 (fondu clair ↔ sombre qui couvre aussi les Réglages, publié à 1 h 54), #369 et #370 (l'assistant cite les services de l'État vérifiés), #371 (limite de 10 min à la vérification nocturne des retraits, qui avait bloqué la collecte 2 h 30), #372 à #374 (ci-dessous). Déploiement local unique à 6 h 43, vérifié en réel.
- **Démarches dans la langue choisie (ML-14)** : fiche traduite gardée à part, valable pour sa version française (#372) ; traduction des fiches par la même chaîne que les articles, `translate --procedures`, rien envoyé (≈ 3,7 $ anglais, ≈ 11,7 $ wolof, #373) ; noms des 18 thèmes en anglais et en wolof (#373).
- **Wolof** : glossaire imposé (Monsieur → Gòor gi, etc.) ; essai refait, 10 sur 10. **Retours wolof de l'utilisateur attendus** avant le grand lot (point 59).
- **Assistant** : politesses anglaises répondues sur le téléphone (#374).
- **Erreur consignée** : changement de branche dans une copie en pleine livraison (sans conséquence ; règle globale ajoutée).

## 16/10, soir, en bref : toute l'app dans la langue choisie, traduction prête
- **Langue de toute l'app** (#358 à #361, #363, #364) : anglais dans le modèle ; interface complète en anglais et en wolof (wolof en traduction automatique, signalée) ; choix Français / Wolof / English dans la présentation et les Réglages ; articles et démarches dans la langue choisie, sinon en français avec une mention (`fallback=fr`, le fil n'est plus réduit en wolof) ; dictée en anglais ; assistant qui cherche aussi dans les pages françaises (défaut trouvé par une vraie question après déploiement, corrigé, ERREURS.md) ; notifications dans la langue de chaque téléphone ; abonnés anglais comptés dans la console. Mises à jour à distance publiées, déploiement local fait.
- **Traduction** (#362) : commande `translate --lang wo|en` (Sonnet 5.5, décision de l'utilisateur), mode `--trial`. Essai du 16/10 au soir : 20 traductions sur 20 acceptées, 0,21 $ ; page de relecture https://claude.ai/artifact/SqgSrwTtRJtEXsQps43jms. Écart repéré : « Premier ministre » transcrit en wolof au lieu de « Njiitu Jëwriñ yi ». **Grand lot (≈ 85 $) en attente de l'utilisateur** (point 59).
- **Exploitation** : autorisation permanente de redémarrer les services locaux après une fusion ; tunnel ngrok retrouvé arrêté (avec le filtre public) puis relancé, désormais relancé par `services.sh` ; disque à 7,8 Go libres.
- **Incidents consignés** (ERREURS.md) : navigateur de l'audit en anglais (fusion bloquée), assistant muet en anglais.

## 16/10, après-midi, en bref
- **ING-04 fusionnée (#356)** : retraits vérifiés aussi sur la Primature et 14 ministères (6 sites non vérifiables, `docs/sources.md`) ; essai réel : le discours FILDAK retiré par la Primature est trouvé, aucun faux retrait. **Déploiement à lancer par l'utilisateur** (point 57, refusé par la protection de sécurité).
- **Phase multilingue chiffrée** (`docs/cadrage/phase-multilingue.md`) : 6 520 articles visibles, 5 824 sans wolof, aucun en anglais ; décisions attendues au point 58.
- **Découvert** : articles de démonstration de WordPress publiés comme actualités (DATA-10), à vérifier puis écarter.
- **Erreur consignée** : fichier effacé par `git checkout --` pendant un test de mutation (ERREURS.md, règle globale ajoutée).

## Reprise de session (mise à jour le 17/10/2026, 7 h)

**Changements depuis la version du 16/10 ci-dessous** : `main` = #374, aucune branche en cours ; copies de travail `-w2` et `-w4` (une copie par livraison en cours, jamais de changement de branche dans une copie occupée). Tâches immédiates : (1) retours wolof de l'utilisateur → `wolof-glossary.ts` puis `translate --lang wo --trial 10` depuis `C:\bic-gouv-sn` ; (2) sur accord (points 59 et 61) : grand lot des articles puis `translate --procedures` ; (3) VOX-11 rattrapage français en cours (≈ 3 700 articles) ; (4) ML-13 voix anglaise après les rattrapages ; (5) DATA-10 sur accord (point 60).

## Reprise de session (préparée le 16/10/2026, 15 h)

À lire en premier par la session suivante, pour reprendre exactement là où la précédente s'est arrêtée.

**Mode** : autonome prolongé (demande du 14/10). S'arrêter et demander pour toute dépense, toute question de sécurité ou de données personnelles, et toute action difficile à défaire.

**Démarrage**
1. Lire CLAUDE.md, backlog.md, decisions.md, ce fichier et `A-FAIRE-UTILISATEUR.md`.
2. Lancer `bash /c/Users/HP/bgs-ops/services.sh` : il relance ce qui ne tourne plus (API 3100, console 3001, surveillance, filtre public 3200, Metro 8081, voix) et ne touche pas au reste. Le mode d'emploi de tous les scripts est dans `C:\Users\HP\bgs-ops\README.md`.
3. Travailler dans `C:\bic-gouv-sn-w2`, sur une branche partie de `origin/main`. Livrer avec `bgs-ops/ship.sh`, puis lancer `bgs-ops/deploy.sh` si l'API, la console, `shared-types` ou l'ingestion ont changé.

**État au moment du passage**
- `main` = #354 et les commits suivants ; aucun travail non livré, aucune branche en cours.
- Dernière mise à jour à distance : « Lecture unique, carte et barre, réglages, audit » (#353).
- **Services en marche** : API, console, surveillance (22 sites + der.sn), filtre public et tunnel ngrok, Metro (sur #353), rattrapage des voix françaises.
- **Voix** : 650 sur 4 975 articles faits le 16/10 à 15 h. Le journal de ce lancement est dans le dossier temporaire de l'ancienne session ; le suivant ira dans `bgs-ops/logs/voices-fr.log`.
- **Tunnel ngrok** : relancé par `services.sh` s'il est tombé (autorisation permanente de l'utilisateur du 16/10, qui couvre aussi les redémarrages après une fusion : collecte seule ou `deploy.sh`). Le 16/10 à 19 h 20, il était tombé (avec le filtre public) : les téléphones ne joignaient plus l'API ; relancé.
- **Ancien serveur web 8084** : il sert un vieil export web de l'app ; son script n'existe plus. Inutile aujourd'hui ; ne pas le recréer sans besoin.

**Tâches immédiates, dans l'ordre**
1. **IOS-10 TestFlight** : l'utilisateur doit lancer une fois la commande du point 55 (connexion Apple). Ensuite : suivre la compilation, vérifier l'envoi à App Store Connect, inviter le testeur et lui donner le lien TestFlight.
2. **VOX-11 / VOX-12** : laisser finir le rattrapage français. Ensuite, mettre à jour le serveur des voix (alerte `protobuf`), puis lancer le rattrapage wolof (`--lang wo`).
3. **Retours de l'utilisateur sur la version #353** : audio, panneau de la carte, barre inversée, réglages, bouton « Filtrer ».
4. **ML-12 (traduction)** : attendre la décision du point 59 sur l'essai. Si l'utilisateur veut la consigne wolof renforcée : ajouter à `wolof-prompt.ts` une liste de termes officiels (Premier ministre → Njiitu Jëwriñ yi, Président de la République → Njiitu Réew mi, Conseil des ministres → Ndiisoog Jëwriñ…), refaire `translate --lang wo --trial 10` depuis `C:\bic-gouv-sn`. Puis grand lot : `translate --lang en --submit --since 2024-04-02` et `--lang wo`, collecte quelques heures plus tard (`docs/runbooks/traduction.md`) ; démarches ensuite (chaîne à étendre aux fiches).
5. **ML-13 (voix anglaise)** : Kokoro en anglais américain, après les rattrapages français puis wolof (file d'attente, décision du 16/10) ; écoute à l'aveugle face à Chatterbox-Turbo ; `apps/api/src/cli/voices.ts` n'accepte encore que fr et wo.
6. **DATA-10** : 4 articles de démonstration (3 « Bienvenue sur WordPress » à l'Industrie-Commerce, « Happy Easter » à la Culture) : proposition « écarté par le contrôle de qualité » en attente de l'accord de l'utilisateur.
7. Puis : GOV-21 (historique des sites lents), AST-25 (services de l'État dans l'assistant).

**Règles apprises récemment** (détail dans ERREURS.md)
- Lancer `pnpm e2e` en local avant d'envoyer un changement d'animation de fenêtre ou de panneau.
- Écrire les chemins Windows avec l'outil d'édition, jamais dans une chaîne de script.
- Une ressource partagée (son, micro, fichier) n'a qu'un propriétaire à la fois ; tout événement doit supporter d'arriver deux fois.

## Nuit du 15 au 16/10 en bref : lecture unique, carte, réglages, audit
- **Audio** : écouter un autre article coupe aussitôt la lecture en cours ; la dictée de l'assistant met la lecture en pause.
- **Près de moi** : le panneau de la carte descend jusqu'en bas, sous la barre de navigation ; sur cet onglet seulement, la barre prend la couleur inverse du thème.
- **Réglages** : entrée et sortie fluides ; section « Rubriques » retirée (toutes les rubriques sont notifiées).
- **Accueil** : « Agenda », vide, masqué ; bouton « Filtrer » visible dès l'arrivée.
- **Audit des bugs silencieux** (`docs/audits/2026-10-15-bugs-silencieux.md`) : courses au démarrage, doubles ouvertures, notification traitée deux fois, rubriques écrites en dur, alerte « disque presque plein » dans la console.
- **Incidents** : parcours de bout en bout bloqués par la nouvelle fermeture animée (corrigé) ; mise à jour publiée malgré une fusion ratée (sans dommage, script corrigé) ; chemins Windows abîmés dans A-FAIRE (réparés). Voir ERREURS.md.
- **Livré** : PR #353, mise à jour à distance « Lecture unique, carte et barre, réglages, audit » ; serveur, console et surveillance redéployés.
- **En attente de vous** : TestFlight (point 55) ; dossier vide verrouillé `C:\bic-gouv-sn-w3` à supprimer à la main (point 56).

## 14 et 15/10 en bref : vos demandes livrées une à une
- **Android** : nouvelle version installable (modules natifs : mises à jour à distance, navigateur intégré, capture d'écran) ; depuis, chaque amélioration arrive seule par mise à jour à distance (Réglages, paysage, vidéos…).
- **App** : lecture qui continue dans une barre en haut (comme WhatsApp), cercles de progression, carrousel sans bouton pause, listes de la carte défilables sur Android, Réglages allégés avec une page « Logiciels et licences », accueil en pleine largeur en paysage avec un volet refermable, vidéos officielles en aperçu et lues dans l'app. Le fondu clair ↔ sombre est refait (capture de l'écran puis fondu) : en fusion.
- **Console** : menu à défilement indépendant, Usage en tête avec des graphiques interactifs, icône des messages non lus, services de l'État validés d'office (866) et classés par catégorie, démarches par thème, relecture des traductions retirée, notifications écrites avec photo (deux personnes), compteur de l'assistant fidèle à la consommation réelle.
- **Opportunités** : alimentées toutes seules par les annonces des 22 sites officiels ; peu nombreuses tant que les grands portails restent bloqués.
- **Assistant** : annuaire officiel du Gouvernement ; « dernières activités du ministère de la Communication » trouve les communiqués qui citent son ministre.
- **Nettoyage** : code mort et dépendances inutiles retirés ; essais de voix du serveur à supprimer avec votre accord (point 47).
- **Incidents corrigés** : une mise à jour construite depuis une copie de travail (republiée proprement, script verrouillé) ; l'en-tête du backlog abîmé par un script (réparé). Voir ERREURS.md.
- **À choisir** : le panneau « Filtrer » (trois maquettes, point 48).
- **Entreprendre (DER/FJ)** : espace en service (10 pages officielles, 20 actualités), carte sur l'accueil, mise à jour publiée.
- **Soir du 15/10** : panneau « Filtrer » (option A) en service ; accueil allégé (cause probable de la fermeture sur iPhone) ; serveur des voix et ordinateur nettoyés.
- **iPhone / TestFlight** : profil prêt ; il manque votre connexion Apple une fois (point 55).
- **Alerte disque** : plein cette nuit, rattrapage des voix arrêté ; 9,6 Go libres après nettoyage du cache npm (point 54). Voix et PDF de la Santé relancés.

## Nuit du 11 au 12/10 (mode autonome) en bref : tous les ministères lisibles, deux défauts graves corrigés
- **Ministères** : 19 ministères collectés sur 26 (plus la Présidence et la Primature), 21 sites suivis en temps réel. Les 7 autres n'ont pas de site lisible (certificat invalide, mot de passe, site figé avant le gouvernement actuel, aucun site) ou attendent une décision (Finances, point 43).
- **Sites à revoir** (#315) : revus automatiquement chaque semaine, la nuit ; la console les montre et alerte dès qu'un site publie de nouveau. Première revue le 12/10 à 2 h 18 : aucun n'est revenu.
- **Par institution** (#317, #320) : pastille « Institutions » à côté de « Tout », liste des institutions avec leur nombre d'articles, une page par institution, lien « Toutes les actualités : … » dans chaque article. Sur votre téléphone : fermer puis rouvrir l'app.
- **Console** (#321) : tableau « Sources suivies » (par institution : articles, dernier article, dernière arrivée dans l'app, protection du site).
- **Historiques** : Numérique, Forces armées et Enseignement supérieur chargés en entier (≈ 1 500 articles de plus) ; la Santé est en cours.
- **Défauts graves trouvés et corrigés** (ERREURS.md) :
  - 15 articles de ministères masqués à tort cette nuit par la vérification des retraits, qui les relisait sur presidence.sn : corrigé (#318) et réaffichés ;
  - verrou d'écriture qui échouait sous Windows au lieu d'attendre son tour (#322) ;
  - rattrapage des voix bloqué 2 h sur l'ancien code, puis une lecture orpheline sur le serveur : arrêt net désormais en cas de refus de la base (#316).
- **Assistant** : banc d'essai élargi à tous les ministères (#319) ; aucune question ministérielle hors des 3 premières pages.
- **Voix** : rattrapage français en cours (≈ 3 400 articles restants), puis wolof.
- **Décisions qui vous attendent** : points 43 à 46 de `A-FAIRE-UTILISATEUR.md`.

## 11/10 en bref : un assistant qui comprend, des voix plus naturelles
- **Articles des ministères « non disponibles »** : le serveur de développement du téléphone servait encore le code du 08/10 (qui n'acceptait que presidence.sn) ; mis à jour, 300 articles récents vérifiés lisibles. Fermer puis rouvrir l'app suffit.
- **Assistant** (batterie de 56 questions de citoyens, puis 15 en wolof) :
  - cause des refus trouvée et corrigée : les 5 articles les plus récents de toute la base étaient imposés à chaque question d'actualité (#307) ;
  - abréviations, fautes, postes actuels, institution citée, accueil et remerciements, message d'excuse avec solutions (#307) ;
  - appels bloqués refaits une fois (#308) ; wolof de toute orthographe reformulé en recherche française (#309) ;
  - comparatifs à l'aveugle : **wolof par Sonnet 5.5** (13 sur 15), **français par Haiku 4.5** (11 sur 15) ; coût réel affiché dans la console (#310, #311).
- **Voix** : Kokoro remplace Jessica avec un lecteur intelligent et un lexique corrigé par l'utilisateur (#305) ; le serveur des voix lit désormais seul, même quand l'ordinateur dort (#312) ; rattrapage français puis wolof lancés.
- **Reste à faire** : services de l'État dans l'assistant (après vérification), relecture du wolof par des natifs, historique complet des sites lents (GOV-21).

## 10/10 en bref : 16 ministères en ligne à côté de la Présidence et de la Primature
- **Articles** : 3 481 visibles dans l'app (978 de la Présidence, chacun en français et souvent en wolof ; 2 503 des ministères et de la Primature), plus 98 doublons masqués (la version de la Présidence est gardée). Chiffre corrigé le 10/10 au soir : le premier comptage (7 156) comptait deux fois les articles de la Présidence.
  - Ministères importés : Justice 113, Industrie-Commerce 10, Énergie 174, Hydraulique 303, Agriculture 250, Pêches 75, Emploi-Formation 507, Intérieur 55, Culture 137, Enseignement supérieur 23, Forces armées 172, Santé 180, Numérique 198, Infrastructures 5, Affaires étrangères 20.
  - Fusions : #294 à #298.
- **Collecte** : suivi automatique de 17 sites. À chaque passage, la Présidence est lue d'abord, puis un seul autre site, celui qui attend depuis le plus longtemps (#300).
- **Incidents du matin, réglés et consignés dans ERREURS.md** :
  - Présidence non relevée de 4 h 12 à 8 h 30, la collecte étant retenue par les galeries des ministères ;
  - import des trois derniers ministères retardé jusqu'à 12 h 51 par un script d'attente défaillant.
- **App** : texte « À propos » mentionnant les ministères (#299). Les noms des ministères ajoutés après la version Android du 09/10 n'apparaîtront qu'avec la prochaine compilation ; leurs articles s'ouvrent déjà.
- **À revoir** (`docs/sources.md`) : Finances, Budget, Économie, Famille, Fonction publique, Microfinance, Transports, Urbanisme, Jeunesse et Sports, Environnement, Éducation ; sans site : Mines, Communication, SGG. Robot Facebook non construit (bloqué par les garde-fous de l'outil) : voie officielle Meta (point 42).
- **Reste à faire** :
  - historique complet des sites lents depuis le serveur (GOV-21, point 38) ;
  - photos des galeries des ministères (tâche dédiée, collecte arrêtée) ;
  - nouvelle compilation Android ;
  - phase multilingue avec budget global (ML-01 à ML-06).

## 09/10 en bref : la Primature rejoint la Présidence
- **Décision de l'utilisateur** : la plateforme relaie tout le Gouvernement (Présidence, Primature, ministères) ; en cas de doublon, la version de la Présidence est gardée. CLAUDE.md §1 et `decisions.md` mis à jour (#283).
- **Sources cartographiées** (`docs/sources.md`) : Primature ; 14 ministères au site actif, 15 à revoir ou sans site ; réseaux sociaux écartés, proposition alternative au point 39.
- **Primature en ligne** : chaque article porte son institution (#285) ; collecte de la Primature et règle « un contenu, un article » (#287) : **374 articles importés, 94 doublons masqués** (comptes rendus du Conseil des ministres déjà publiés par la Présidence), 1 257 articles visibles ; suivi des nouveautés toutes les 15 minutes à côté de la Présidence (#289) ; photos et images (#290).
- **App** (#288) : textes d'accueil et « À propos » pour le Gouvernement, institution sur les cartes, « Source : primature.sn », « Aussi publié par ». Nouvelle version Android en compilation (point 40).
- **Sécurité** (#286) : modèle de la voix wolof figé et chargé sans code exécutable (alertes `transformers`).
- **Traduction wolof** : lot de 351 rentré (349 enregistrées) ; coût réel 18,83 $ pour 14,45 $ estimés, estimation corrigée (#284). Primature et reste de l'historique à valider (point 41).
- **Ministères (en cours)** : interfaces WordPress ouvertes pour Justice, Industrie et Commerce, Énergie, Hydraulique, Agriculture (≈ 900 articles), mais texte à nettoyer site par site avant toute publication.
- **Reporté par l'utilisateur** : serveur d'IA (point 38), compilation iPhone, relecture des traductions.

## 08/10 (après-midi et soir) en bref : l'assistant répond, les voix parlent
- **Assistant en discussion** façon Claude (#272, #274) : logo et phrase d'accueil courte, bulles, sources en étiquettes, dictée en français par le téléphone, clavier rangé à l'envoi, logo BIC-GOUV en profil, « Réessayer ».
- **Réponses justes sur l'actualité** (#274) : date du jour, articles récents favorisés, dernier article d'une rubrique citée. Vérifié : « Où est allé le président cette semaine ? » et « le dernier Conseil des ministres » répondent avec leurs sources.
- **Recherche par le sens** (#275) : modèle ouvert sur le serveur, sans coût ; sur 72 questions, bonne page dans les 5 premières 89 % (83 % par les mots seuls).
- **Voix** (#267, #269, #270) : 100 articles enregistrés en français (Jessica), 3 en wolof (Adia, lente sur l'ordinateur : un serveur avec carte graphique est nécessaire pour tout l'historique) ; lecture dans l'app avec pause et reprise.
- **Traduction wolof** (#271, #273) : 29 articles sur 30 du premier lot enregistrés, à relire par l'utilisateur dans la console ; coût réel ≈ 3,50 $ pour ce lot (dont une erreur de ma part, consignée).
- **Incidents réglés et consignés** : console sans adresse de l'API, erreur de la console après la mise à jour de Next.js, collecte arrêtée 5 h (Windows et ancienne version), filtre sans MP3, numéro de demande de fusion supposé.
- **Ce qui attend l'utilisateur** : relire les traductions ; compilation iPhone (après `pnpm install`) ; décider du serveur avec carte graphique pour les voix wolof et du reste de la traduction (≈ 13 $ pour les 349 articles restants depuis octobre 2025).


## 07 et 08/10 en bref : l'assistant et la traduction wolof sont prêts, ils attendent la clé
- **Serveur** (#258) : adresse `POST /v1/assistant/answers` (question ou « Est-ce vrai ? »), réponses tirées des seules publications officielles avec leurs sources ; Claude Haiku 4.5 ; **plafond de 10 000 questions par mois** tenu même avec plusieurs serveurs ; au-delà, pause aimable jusqu'au 1er du mois suivant ; interrupteur « Assistant » dans le contrôle à distance ; 20 questions par heure et par adresse ; aucune question conservée ni écrite dans les journaux.
- **App** (#260) : l'onglet Assistant remplace « Bientôt disponible » : question ou information à vérifier, réponse et sources à ouvrir, messages simples (introuvable, hors sujet, pause du mois, indisponible, sans connexion). Visible après une mise à jour de l'app installée.
- **Console** (#261) : page « Assistant » (questions du mois, coût estimé, limite modifiable par un administrateur) et alerte à 80 % des questions.
- **Sécurité** (#259) : Next.js 16.3.8 (faille publiée le 07/10), sans exception à l'audit.
- **Traduction wolof** (#263) : commande `translate:wolof` (estimation sans clé, envoi par lots à moitié prix, collecte avec contrôles avant enregistrement, mention « Traduction automatique ») ; coût mesuré : ≈ 8,70 $ pour les 379 articles depuis octobre 2025 (Opus 5.5), ≈ 14,75 $ pour les 658 ; mode d'emploi `docs/runbooks/traduction-wolof.md`.
- **File de relecture** (#264) : console « Traductions à relire », français et wolof côte à côte, « Valider » ou « Écarter », chaque décision versionnée et journalisée.
- **Ce qui attend l'utilisateur** : créer la clé Anthropic avec une limite de dépense et la saisir soi-même (point 36, `docs/guides/brancher-l-assistant.md`) ; puis valider le coût de la traduction (point 35) et faire relire un premier lot de 30 articles par un locuteur natif.
- **Suite prévue** : audio (voix Jessica en français, Adia en wolof) sur notre serveur, qui dépend du choix de l'hébergement (point 27) et de la vérification des licences des voix.


## 02 et 03/10 en bref
- **Identité** : baobab de l'utilisateur vectorisé (#240) ; icône officielle BIC-GOUV posée partout (#244) ; nom « BIC-GOUV Sn » ; ouverture « La graine » (étoile → bandes → nom → graine → baobab, 2,5 s d'icône, fluide dès le début, #246). Icône, nom et écran natif visibles après la **nouvelle compilation** (point 28).
- **App** : « Écouter » réservé aux articles et démarches, bouton flottant Pause / Reprendre, reprise au mot près, message « Voix wolof bientôt disponible » (#241) ; Participer en fil guidé (#236).
- **IA** (cadrage, rien de payant engagé) : workflow validé (`docs/cadrage/workflow-ia.md`) ; voix wolof Adia_TTS et voix française Jessica (Piper « upmc ») retenues ; essai de traduction wolof par Claude jugé parfait ; services payants (API Claude) reportés après les tâches sans IA.
- **Sécurité** : exceptions d'audit limitées pour node-forge (#223) et braces (#243), décisions de l'utilisateur.
- **SCALE-02 terminé** (#248 à #251) : tous les contenus (articles et démarches avec historique, thèmes, services, contrôle à distance, état de la collecte) dans PostgreSQL dès que `DATABASE_URL` est réglée ; commande `content:import` pour recopier les fichiers une fois ; procédure `docs/runbooks/passer-a-postgresql.md`. Plus aucun fichier partagé entre serveurs d'API.
- **Ce qui attend l'utilisateur** : la nouvelle compilation (20 min ensemble), l'hébergement (point 27), la vérification des services de Dakar (point 2), le logo complet en vectoriel d'origine (point 34), la clé Claude au moment voulu (point 35).

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + **4 contrôles verts** (qualité et tests, constructions avec **audit d'accessibilité** sur 91 écrans dont 29 à 320 px et **9 parcours de bout en bout**, secrets et dépendances, **conteneurs**).
- Articles : 970 (FR + WO), 36 avec leurs PDF officiels. Démarches : 718 fiches, 18 thèmes. Services : 880 proposés, vérification humaine dans la console.
- Nuit du 27 au 28/09 (PR #79 à #94) : voir l'historique du backlog (CSP, contrôle à distance, PDF officiels, audit d'accessibilité automatique…).
- Journée du 28/09 (PR #95 à #114) :
  - articles retirés par la Présidence **masqués** (décision de l'utilisateur), contrôle chaque nuit, onglet « Articles masqués » ;
  - collecte **ininterrompue** (réessais jusqu'à toutes les 10 min, rattrapage après panne) et **verrou d'instance unique** (3 collectes tournaient en même temps : corrigé, données intactes) ;
  - console : recherches sans résultat (seuil de 3), navigation groupée, état des protections des sources, **notifications à deux personnes** (envoi réel à brancher avec la version de test), **journal d'audit** avec contrôle d'intégrité ;
  - performances : lecture du stockage en cache, tri et extraits en cache, recherche tolérante aux fautes et réutilisée 60 s (liste ~30 ms, recherche répétée ~300 req/s ; `docs/capacite.md`) ;
  - fiabilité des contrôles : polices de la console dans le dépôt, démarrage de Chrome plus robuste ;
  - accessibilité : langue réellement affichée déclarée (page et articles en wolof) ;
  - app : préchargement de l'article probable suivant (jamais en économie de données) ;
  - notifications : compteur « à vérifier » dans la navigation, échec d'envoi noté dans l'historique.
- Soir du 28/09 (PR #115) : décisions de l'utilisateur consignées (banc d'essai wolof, parcours des démarches, écran « Comptes », compte Apple individuel).
- Nuit du 28 au 29/09 (PR #116 à #121) :
  - fiche démarche en **parcours visuel** (rubriques de la source reliées par un fil, dans leur ordre) ; documents à fournir en simple liste, **plus de cases à cocher** ;
  - console : écran **« Comptes »** (lien d'activation à usage unique, rôle, désactivation, second code, rien sur son propre compte, tout au journal) ; écritures des comptes sécurisées ;
  - **deux volets** sur tablette et pliable déplié pour les démarches et « Près de moi » ;
  - **parcours de bout en bout** dans la CI (ils ont révélé que l'audit validait, en local, un Accueil en erreur : cache corrigé) ;
  - **clés d'idempotence** sur les écritures (un formulaire envoyé deux fois n'agit qu'une fois) ; une seule notification en attente par article ;
  - protection du shell durcie (JavaScript en ligne avec accent grave refusé).
- Journée du 29/09 (PR #123 à #134), décisions de l'utilisateur de midi appliquées :
  - **garde-fous des secrets** (SEC-05) : fichiers de secrets illisibles pour les outils et l'IA, clé remplaçable sans rien casser (la clé locale exposée a été remplacée), doctrine de production (`docs/securite-des-secrets.md`) ;
  - **mot de passe oublié** (ADM-11) : nouveau lien d'activation, second code gardé ;
  - **statistiques anonymes** (ADM-12) : réglage dans l'app (désactivé par défaut) et **demande comme une permission** après un premier article (activation immédiate si oui), écran « Usage de l'application » dans la console, transparence (`docs/statistiques-anonymes.md`) ;
  - **conteneurs** API, console, collecte (`infra/`), exigés en CI ; **chiffrage de l'hébergement** (`docs/hebergement.md`, environ 65 €/mois au départ, une seule instance de l'API tant que SCALE-01 n'est pas fait) ;
  - **notifications push, partie serveur** (abonnements par rubrique, heures calmes, envoi Expo) ; l'écran de l'app attend la version de test ;
  - **objectif « moins de 2 minutes »** mesuré dans la console ; **contrôle à 320 px** ; **auto-vérification offensive** de l'API (défaut 500 corrigé) ; audit croisé AUD4 ; nettoyage des fichiers temporaires orphelins.
- Soir du 29/09 (PR #137 à #140), **préparation à plusieurs serveurs d'API** :
  - **SCALE-01** : sessions et étapes de connexion de la console, clés anti-doublons et limite de débit partagées dans **Redis** (`REDIS_URL`) ;
  - **SCALE-02** (tranches 1 à 3) : **PostgreSQL** entre dans l'API (`DATABASE_URL`, schéma mis à jour au démarrage) ; statistiques d'usage, recherches sans résultat et journal des erreurs **additionnés** en base par chaque serveur ; sans base, les fichiers restent utilisés ;
  - tout est testé en CI contre un vrai Redis et un vrai PostgreSQL 18 (PGlite en local) ; Redis et PostgreSQL ajoutés à `infra/docker/compose.yaml`.
- Nuit du 29 au 30/09 et matinée (PR #141 à #149) :
  - **SCALE-02** suite, avec l'accord de l'utilisateur : abonnements aux notifications, notifications de la console, comptes de l'équipe et **journal d'audit refusant en base toute modification** passent dans PostgreSQL ; commandes d'administration branchées sur la même base ;
  - **notifications automatiques** (décision de l'utilisateur, 1 h 20) : chaque nouvel article annoncé avec photo, premiers mots et source, dans la langue de chacun, hors heures calmes ; pause (éditeur) et reprise (administrateur) dans la console, 10 par heure au plus ; nombre de téléphones prévenus affiché ;
  - **app** : demande comme une permission, Réglages (notifications, heures calmes 22 h – 7 h par défaut, rubriques), ouverture de l'article au toucher ; actif dès que le projet EAS existe ;
  - envoi Expo à sa cadence officielle (600 par seconde) ; garde-fous des futures clés Apple et Firebase ; guide de la version de test complété (notifications) ; audit croisé AUD5.
- Après-midi et soirée du 30/09 (PR #151 à #156), version de test sur iPhone installée par l'utilisateur :
  - compilation iOS corrigée (sentry-cli introuvable avec pnpm, ERREURS.md) ;
  - **« Près de moi » carte d'abord** avec panneau glissant à trois hauteurs (Reanimated, @gorhom/bottom-sheet ; plafond de poids relevé à 7,5 Mo par l'utilisateur), **repères par type** (7 teintes et icônes, contrastes testés), **itinéraire dans Google Maps**, carte toujours claire ;
  - **barre de navigation** à pastille glissante ; **fondu** en fin de présentation ; **présentation en chemin** (direction A choisie parmi trois maquettes).
- Nuit du 30/09 au 01/10 (PR #157 à #161), mode autonome :
  - console : **téléphones abonnés** (totaux seulement) et **alerte rouge** dès 3 annonces automatiques en 30 minutes ;
  - Réglages › « Présentation de l'application » › **« Redémarrer »** (libellé de l'utilisateur) ;
  - « Près de moi » en **volet latéral** sur tablette, pliable déplié et téléphone en paysage ;
  - **journaux de l'API sans IP ni recherche** (minimisation) ; **inventaire des données** (`docs/confidentialite/`) ; **fichier des 271 textes à traduire en wolof** (`docs/traduction/`, `pnpm i18n:wolof`) ;
  - **dossier de cadrage** pour la séance de 13 h : `docs/cadrage/opportunites-participer-ia.md` ;
  - audit croisé AUD6 ; mesure du poids de l'app (Sentry ≈ 2 Mo de source, levier principal mais bloqué par PERF-03).
- Matin du 01/10 (PR #162 à #181), mode autonome :
  - **parcours de bout en bout n° 7** : « Redémarrer » la présentation depuis les Réglages, étape par étape, jusqu'à l'app ;
  - **audit d'accessibilité de chaque étape de la présentation** (clair, sombre, 320 px ; 92 écrans) : il a trouvé une carte de texte inatteignable au clavier, corrigée ;
  - console : **alerte d'afflux d'abonnements** (au moins 500 en 24 h et 5 fois le rythme habituel ; heure d'abonnement gardée à l'heure près, à confirmer) ; journal des erreurs : **« Marquer comme réglée »** (éditeurs, journal d'audit, l'erreur revient si elle se reproduit) ;
  - console : **résumé « À traiter »** en tête de l'accueil (erreurs en cours, alertes des notifications, notifications à vérifier, envoi en pause), chacun menant à sa page ; **procédure** pour les deux alertes des notifications (`docs/runbooks/notifications-alertes.md`) ;
  - **parcours de bout en bout n° 8** (marquer une erreur comme réglée) : il a trouvé une confirmation qui disparaissait aussitôt, corrigée (ERREURS.md) ;
  - tests de la logique des types partagés (couverture 83 → 88 %) ; **faux wolof retiré des données de test** (« [wo] … » à la place) ; catalogue wolof de l'interface vérifié vide, comme prévu ;
  - fin de matinée (PR #175 à #181) : correctifs des dépendances du serveur (Next 16.3.7, sharp, vitest ; rien côté app) ; **totaux d'abonnés gardés une minute** (le comptage complet aurait coûté cher à 20 millions) ; **parcours n° 9** (de « À traiter » à la notification en attente) ; **audit d'accessibilité 2,5 fois plus rapide en CI et plus strict** ; une erreur réglée ne s'affiche plus « En cours » ; **taille de la base à indexer** pour l'IA (environ 2 millions de jetons) dans le dossier de cadrage ; audit croisé AUD7 ;
  - « Près de moi » : avertissement de localisation à côté du volet latéral ;
  - protection du terminal : **toute poussée doit suivre le scanner de secrets** (deuxième entorse à cette règle, ERREURS.md) ;
  - dossier de cadrage : **ce que permet chaque portail d'Opportunités** (règles des robots, certificats : marchespublics.sn et directiondesbourses.sn bloquent une collecte sûre ; FONGIP confirmé).
- Après-midi du 01/10 (PR #185 à #193), mode autonome, demandes de l'utilisateur :
  - **erreurs rouges de « Près de moi »** corrigées (lettres de la carte manquantes : réponse vide au lieu d'une erreur) ;
  - **invitations dès l'accueil** : notifications, puis localisation, puis statistiques, bouton positif coloré, « Non merci » toujours visible ; position obtenue tout de suite si autorisée, et à chaque ouverture ; ligne « Position » dans les Réglages ;
  - **fluidité** : réaction visuelle immédiate sur tous les contrôles, onglets ouverts dès le contact du doigt, articles, démarches et accueil affichés progressivement, « Démarches » et « Près de moi » préparés en arrière-plan, photos gardées en mémoire, recherches non stockées hors ligne ;
  - **app servie en mode optimisé** depuis une copie séparée du projet (`C:/bic-gouv-sn-demo`, toujours sur main) : la version de développement est 2 à 5 fois plus lente que l'app finale ;
  - audit croisé AUD8 ; inventaire des données mis à jour (position).
- Soirée du 01/10 et nuit (PR #196 à #204), demandes de l'utilisateur de 19 h 45 :
  - **erreur plein écran de « Près de moi »** en mode optimisé corrigée (carte chargée sans morceau séparé) ;
  - **Opportunités** : saisie dans la console depuis la page officielle, publication par une seconde personne, correction possible avant publication, lien limité aux portails de l'État ; section de l'accueil après les articles, liste par type, fiche menant à la page officielle ;
  - **Participer** : « Écrire au gouvernement » puis « Signaler un problème » (photo prise ou choisie, lieu facultatif), anonymes, reçus dans la console « Participation » avec la photo débarrassée de ses données cachées, effacés au bout d'un an ; interrupteur à distance respecté aussi par l'API ; la photo demande une nouvelle compilation ;
  - **écran de démarrage** : le baobab se dessine trait par trait puis s'efface en fondu ; l'écran natif devient un simple fond (à la prochaine compilation) ; **fiche du logo** à fournir (`docs/guides/logo-et-ecran-de-demarrage.md`) ;
  - console : « À traiter » compte aussi les messages des citoyens et les opportunités à vérifier ;
  - sécurité : réglage `TRUST_PROXY` (sans lui, derrière un CDN, toutes les limites par adresse compteraient le pays entier comme une seule personne) ; audit croisé AUD9.
- Nuit du 02/10, de 1 h à 13 h (PR #206 à #217), mode autonome :
  - **fusions bloquées** depuis minuit : une faille sans correction dans l'outil de fabrication d'Expo (node-forge) fait échouer le contrôle des dépendances de toutes les PR ; une exception ciblée a été refusée par le garde-fou de sécurité : **décision de l'utilisateur, point 32** ; seule la PR #203 (photo trop lourde) a pu être fusionnée ;
  - app plus légère de 220 Ko (relecture vidéo de Sentry, jamais utilisée, retirée) ;
  - **préparation de l'IA**, sans fournisseur ni coût : base découpée en 5 866 passages traçables, recherche par mots, jeu de 72 questions d'évaluation, contrat de réponse avec citations obligatoires vérifiées avant affichage, recherche combinée mots + sens ; **essai local de deux modèles ouverts gratuits** : le moyen (e5-base) trouve la bonne page dans les 3 premières pour 94 % des questions (81 % par mots seuls), en 16 ms par question (cadrage, partie 3) ;
  - mise en forme du texte pour la recherche regroupée (la lettre wolof ŋ traitée partout) ;
  - revue visuelle des écrans de la nuit : choix de Participer coupés au bord, corrigé (PR #217) ; 103 écrans sans défaut d'accessibilité ;
  - partage d'une opportunité (PR #221) ; Dependabot regroupe les paquets TanStack (PR #218) ;
  - **répétition de la fusion** (4 h 30) : les 15 PR en attente fusionnées ensemble en local, sans conflit ; tout est vert (≈ 1 300 tests, 103 écrans audités, 11 parcours) ; code de l'app 6,77 Mo sur Android et 6,67 Mo sur iPhone (7,15 et 7,05 Mo la veille).
- Matin du 02/10 : **décision de l'utilisateur sur le point 32 (option a, 6 h 30)** ; exception limitée à l'alerte node-forge (PR #223), puis **les 16 PR de la nuit fusionnées** (#202, #204 à #211, #217 à #224) ; copie de démonstration et API locale relancées sur la nouvelle version ; essai d'un petit modèle de langage local pour rédiger les réponses : inutilisable (format non respecté, 1 à 4 min par question), aucune invention affichée.
- Contrôle complet : environ 1 300 tests verts, 11 parcours de bout en bout, 103 écrans audités.
- Incident du 29/09 : clé de l'API **locale** apparue dans la conversation ; remplacée le jour même (ERREURS.md).

## En attente de l'utilisateur
Voir `.claude/session/A-FAIRE-UTILISATEUR.md`. Toujours ouverts : compte Apple (en cours), vérification des services de Dakar, logo, identifiant de l'app, questions au BIC (et offre de Sénégal Numérique pour Diamniadio), budget d'hébergement (chiffrage prêt), jeton Sentry, Opportunités et Participer (plus tard), wolof (à la fin).

## Prochaine tâche
- **Fait** : point 32 décidé et toutes les PR de la nuit fusionnées. Restent les mises à jour majeures de Dependabot (#226 maplibre-gl-style-spec, #227 ioredis 6) à examiner.
- **Prochaine séance** : l'IA (cadrage `docs/cadrage/opportunites-participer-ia.md`, partie 3, avec les mesures du 02/10 et la proposition d'un modèle ouvert gratuit), le logo et l'écran de démarrage (fiche `docs/guides/logo-et-ecran-de-demarrage.md`), puis les points 19 à 31 de `.claude/session/A-FAIRE-UTILISATEUR.md` (dont la nouvelle compilation, point 28).

- Ensuite, sur la version de test : QA-02, QA-03, QA-04, QA-09, AUD5-04, AUD6-02, AUD6-03, AUD8-02, AUD8-03, E2E-02, LIC-02, module iPhone pour la photo des notifications (AUD5-07, recompilation).
- Décisions attendues : points 19 (contenus publiés dans PostgreSQL), 20 (Firebase), 21 (envoi à l'échelle nationale), 22 (politique de confidentialité), 24 (compétence de design), 26 (textes de l'invitation à la localisation), 27 (hébergement).

## Services locaux (au 01/10, 19 h)
- **App servie en mode optimisé** depuis la copie `C:/bic-gouv-sn-demo` (sur `main`, mise à jour après chaque fusion) : `npx expo start --dev-client --port 8081 --no-dev --minify`, `EXPO_PUBLIC_API_URL=http://192.168.1.14:3100`. Le dépôt principal reste libre pour le développement. Pour revenir au mode développement (rechargement à chaud, erreurs à l'écran) : relancer sans `--no-dev --minify`.
- API sur 3100 relancée à 15 h avec le correctif de la carte.

## Services locaux (rappel du 01/10, 5 h)
- API sur 3100 relancée sur `main` avec `PUSH_PROVIDER=expo` (toujours sur fichiers : ni Redis ni PostgreSQL installés sur la machine) ; console en développement sur 3001 ; Expo sur 8081 en mode version de test (`--dev-client`, `EXPO_PUBLIC_API_URL=http://192.168.1.14:3100`) ; export web de l'app servi sur 8084 (relais vers l'API) ; une seule collecte temps réel (verrou actif, contrôle des retraits chaque nuit ; elle nettoiera les fichiers temporaires orphelins à son prochain démarrage).
- Changer la clé locale des seconds codes : arrêter l'API, `pnpm --filter @bgs/api admin:rotate-key`, relancer (aucune clé n'est jamais affichée).
- Secrets : gitleaks toujours avec `--redact` et sur le commit (`gitleaks git`), jamais `gitleaks dir` sur le dépôt (ERREURS.md, 29/09).
- Arrêt de la collecte : chercher le processus dont la ligne de commande contient `cli/watch.ts` (arrêter la tâche pnpm ne suffit pas), puis vérifier qu'il n'en reste aucun avant de relancer.


## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (appeler par chemin complet). gitleaks : `C:\Users\HP\tools\gitleaks\gitleaks.exe`. pmtiles : `C:\Users\HP\tools\pmtiles\pmtiles.exe`.
- API locale : dans `apps/api`, `pnpm build` puis `PORT=3100 pnpm start`. Arrêter l'ancien processus `node … dist/server.mjs` avant de relancer (arrêter la tâche de fond ne suffit pas). **Le redémarrage déconnecte la console.**
- Audit d'accessibilité en local : `pnpm --filter @bgs/admin build`, `pnpm --filter @bgs/mobile export:web`, puis `pnpm a11y` (ports 3190-3192, données fictives jetables). Le build de la console n'interrompt pas le serveur de développement sur 3001.
- Fond de carte : `.data/tiles/senegal.pmtiles` (217 Mo) et `.data/map/` (`pnpm map:assets`) ; procédure `docs/runbooks/fond-de-carte.md`.
- Après un changement de branche dont le fichier de verrouillage diffère : `pnpm install --frozen-lockfile` avant toute commande (ERREURS.md, 27/09).
- Expo : pour Expo Go, `EXPO_PUBLIC_API_URL=http://192.168.1.14:3100 npx expo start --port 8081 --clear --go --offline` (sans `--lan`). Après toute installation de dépendances : arrêter l'ancien processus sur 8081, relancer, puis demander le paquet de contrôle.
- Vérification visuelle : export web + Chrome headless (`scratchpad/cdp-shot.mjs`). Données de test : toujours une copie jetable, jamais `.data/`.
- Pas de Python sur la machine : scripts en Node. Tout texte ou code contenant un accent grave, `$`, un antislash ou une séquence d'échappement s'écrit avec l'éditeur, jamais par le shell (ERREURS.md, 27/09 et 28/09).
