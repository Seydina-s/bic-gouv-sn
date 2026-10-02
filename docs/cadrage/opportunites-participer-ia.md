# Cadrage : Opportunités, Participer, Assistant IA

Préparé le 01/10/2026 pour la séance de travail avec l'utilisateur. Ce document **ne décide rien**. Pour chaque sujet, il rassemble :
- ce que montrait la maquette ;
- les sources officielles vérifiées ;
- les options, avec une recommandation ;
- les coûts et les contraintes ;
- les questions à trancher.

Les liens ont été vérifiés le 01/10/2026 ; les prix aussi, et ils restent à revérifier le jour de toute commande.

Rappel de la règle du projet (CLAUDE.md §1) : rien ne s'affiche sans source officielle. Opportunités et Participer demandent donc d'**ajouter des sources** à la liste des sources de vérité : c'est votre décision.

---

## 1. Opportunités

### Ce que montrait la maquette
Trois catégories en tuiles :
- **Financement** : « Appel à projets jeunes entrepreneurs », clôture dans 12 jours ;
- **Concours** : « Concours de la fonction publique », inscriptions ouvertes ;
- **Appel d'offres** : « Marchés publics de la semaine », 8 nouveaux avis.

### Sources officielles repérées

| Catégorie | Source | Ce qu'on y trouve |
|---|---|---|
| Marchés publics | [marchespublics.sn](https://www.marchespublics.sn/) (ARMP et DCMP) | Avis d'appel d'offres, avis généraux, attributions ; service d'alertes. Pas d'API ni de flux ouvert trouvé. |
| Concours, recrutements | [fonctionpublique.gouv.sn](https://fonctionpublique.gouv.sn) (arrêtés d'ouverture, résultats) ; plateforme [emploi-fpublique.sec.gouv.sn](https://emploi-fpublique.sec.gouv.sn/) | Ouvertures de concours, conditions, inscriptions en ligne |
| Financement des jeunes et des femmes | [der.sn](https://www.der.sn/) et [financement.der.sn](https://financement.der.sn/appel-a-projet/) (DER/FJ, rattachée à la Présidence) | Appels à projets et à manifestation d'intérêt |
| PME | [adepme.sn](https://adepme.sn/) | Appels à candidatures, concours de l'ADEPME |
| Formation | [3fpt.sn](https://3fpt.sn/appel-a-candidature/) | Bons de formation, appels à candidatures |
| Bourses | [directiondesbourses.sn](https://www.directiondesbourses.sn/), plateforme [boursesetrangeres.campusen.sn](https://mesrisenegal.sn/2025/11/11/ouverture-de-la-plateforme-https-boursesetrangeres-campusen-sn-pour-le-depot-des-dossiers-de-demande-de-bourses-a-letranger/) (MESRI), [sgee-sn.org](https://www.sgee-sn.org/) | Campagnes de bourses, dates de dépôt |

**FONGIP** (vérifié le 01/10, 5 h) : site officiel [fongip.sn](https://www.fongip.sn/). Il présente des produits de garantie (« Nos Solutions ») et un portail de dépôt de dossiers, mais pas de rubrique d'appels à projets : il relève plutôt de l'annuaire que de la collecte.

À vérifier ensemble : la liste exacte des ministères à couvrir.

### Collecte automatique : ce que permet chaque portail (relevé le 01/10/2026, 5 h)
Lecture du fichier `robots.txt`, c'est-à-dire les règles que chaque site fixe aux robots, et de la connexion sécurisée. Aucune protection n'a été contournée.

| Portail | Constat | Conséquence pour la collecte |
|---|---|---|
| der.sn, adepme.sn | Sites WordPress ; seule l'administration est interdite aux robots ; plan du site public | Collecte possible et simple |
| sgee-sn.org, fongip.sn | Aucune restriction ; plan du site public | Collecte possible |
| fonctionpublique.gouv.sn | Pas de fichier de règles (rien d'interdit) | Collecte possible, structure à étudier |
| financement.der.sn | Application web (rendu par JavaScript) | Collecte avec le navigateur automatisé, comme e-senegal.sn |
| marchespublics.sn | Le site présente le certificat par défaut de son pare-feu web (FortiWeb), auto-signé : une erreur de configuration chez l'opérateur, qu'un navigateur signale aussi (vérifié le 01/10, 11 h) | Bloquant tant que ce n'est pas corrigé : à signaler à l'ARMP. Jamais de vérification désactivée de notre côté |
| directiondesbourses.sn | Le site présente le certificat générique de son hébergeur (secureserver.net), pas celui du site (vérifié le 01/10, 11 h) | Collecte impossible en sécurité : à signaler au ministère |
| emploi-fpublique.sec.gouv.sn | Injoignable depuis ici (délai dépassé) | À revérifier depuis le Sénégal ou l'hébergement |
| 3fpt.sn | Refuse les accès automatiques (403), même pour lire ses règles | Pas de collecte sans accord du 3FPT : saisie dans la console ou lien |

Cela renforce l'option C : collecte d'abord là où c'est simple (DER/FJ, ADEPME), saisie ou lien ailleurs, et demande d'accord ou de correction aux organismes concernés. Les agrégateurs privés (par exemple marchesdusenegal.com) sont exclus : ce ne sont pas des sources officielles.

### Options
- **A. Collecte automatique** sur 4 à 6 portails officiels, comme pour presidence.sn : fiches normalisées (type, organisme, date limite, lien officiel), rappel avant la clôture. C'est le plus complet. Mais chaque portail a sa propre structure, et il faut l'accord de chaque organisme.
- **B. Saisie dans la console** : l'équipe ajoute les opportunités majeures depuis les portails officiels, avec une validation à deux personnes et le lien officiel obligatoire. Plus un annuaire de liens vers les portails. Rapide et fiable, mais limité par le temps de l'équipe.
- **C. Hybride (recommandé)** : on commence par B (annuaire et saisie validée), puis on passe une source à la fois en collecte automatique (A), à mesure que les accords sont obtenus. Les marchés publics sont le plus gros volume, mais leur certificat bloque pour l'instant (voir le tableau ci-dessus) : DER/FJ et ADEPME d'abord.

### Questions à trancher
1. Quelles catégories au lancement : financement, concours, marchés publics, bourses, formation ?
2. Ajoutez-vous ces portails à la liste des sources de vérité (CLAUDE.md §1) ?
3. Qui saisit et valide dans la console en attendant la collecte automatique ?
4. Faut-il un rappel avant la clôture (notification, sur accord de la personne) ?
5. Demande-t-on des accords aux organismes (ARMP, DER/FJ…), comme pour la Présidence (L-02) ?

---

## 2. Participer

### Ce que montrait la maquette
- **Sondage de la semaine** : « Quel service public souhaitez-vous voir en priorité dans l'application ? », vote d'un toucher.
- **Signalement** : catégories (Voirie, Éclairage, Salubrité, Eau), photo, position (« Yeumbeul Nord »), « Envoyer le signalement ».
- **Questions des citoyens** : « 87 réponses publiées », « 54 en attente ».

### Ce qui conditionne chaque fonction
- **Sondages**
  - Faibles risques techniques.
  - Sans compte, on ne peut pas empêcher totalement qu'une personne vote deux fois. On limite par installation et par débit, et les résultats sont présentés comme indicatifs.
  - Risque politique : une charte éditoriale doit limiter les questions aux services publics, jamais à un sujet partisan, avec une validation à deux personnes.
- **Signalements**
  - Sans un organisme qui les reçoit et y répond, un signalement « part dans le vide » et déçoit (mairies, ONAS, SENELEC, SEN'EAU…). Il faut donc des partenaires et des délais de réponse.
  - Données personnelles : une photo peut montrer des visages ou des plaques, et la position est précise. Il faut déclarer le traitement à la CDP, flouter ou modérer, et fixer une durée de conservation.
  - Il faut aussi une modération des contenus.
- **Questions et réponses**
  - Il faut des agents pour répondre.
  - Les réponses publiées ne doivent pas devenir des commentaires publics (CLAUDE.md : « pas un réseau social »).

### Options
- **A. Sondages seuls au départ (recommandé)** : questions préparées et validées dans la console, vote anonyme, résultats agrégés. Les signalements suivent dès qu'un organisme partenaire s'engage à les traiter.
- **B. Sondages et signalements d'un coup**, avec un pilote sur une commune ou un service qui s'engage à répondre.
- **C. Report** : Participer reste en « bientôt », pour se concentrer sur l'information et l'IA.

### Questions à trancher
1. Quels types au lancement : sondages, signalements, questions ?
2. Pour les signalements : quel organisme les reçoit, et en combien de temps répond-il ?
3. Qui rédige les questions de sondage, et selon quelle charte ?
4. Publie-t-on les résultats des sondages dans l'app ?
5. Photos et position dans les signalements : on les accepte, ou seulement la commune et du texte ?

---

## 3. Assistant IA et « Est-ce vrai ? »

### Ce que montrait la maquette
- « Répond à partir des sources officielles. »
- Deux entrées : « Poser une question » et « Est-ce vrai ? ».
- Français et wolof, avec la voix.
- La mention : « Vous échangez avec une IA. Pour une situation particulière, un agent peut prendre le relais. »

### Ce qui est déjà prêt
- La base est complète et traçable : 970 articles en français et en wolof, 718 démarches, les services de l'État vérifiés.
- PostgreSQL est en place ; l'extension pgvector, prévue au stack, servira à retrouver les passages utiles.
- Les interfaces de fournisseur sont prévues (`LlmProvider`, `TtsProvider`, `AsrProvider`) : changer de fournisseur ne demande qu'un adaptateur.

### Fonctionnement proposé (RAG)
1. La question est comparée à notre base, et seuls les passages officiels les plus proches sont retenus.
2. Le modèle répond **uniquement** à partir de ces passages, avec une **citation obligatoire** (lien et date). Sans passage pertinent, il répond qu'il ne sait pas.
3. « Est-ce vrai ? » suit le même principe. Il dit ce que disent les sources officielles, ou qu'il n'en trouve aucune. Il ne tranche jamais sans source.
4. Il refuse les sujets hors périmètre et reste politiquement neutre. Un jeu de test « zéro invention » est passé avant chaque mise en ligne.

### Taille de la base à indexer (mesurée le 01/10/2026)
Texte réellement publié, sans la mise en forme :
- 972 articles en français : environ 3,3 millions de caractères ;
- 318 articles en wolof : environ 0,7 million (la Présidence ne publie plus en wolof depuis le 01/10/2025, question L-02) ;
- 718 démarches : environ 2,2 millions.

Soit environ 6 millions de caractères, de l'ordre de 2 millions de jetons. Conséquences :
- **indexation initiale** (transformer chaque passage en vecteur pour la recherche) : moins d'un dollar aux prix publics courants des modèles d'indexation (à vérifier au moment du choix), ou rien avec un modèle ouvert installé sur notre serveur ; ensuite, seuls les nouveaux articles sont indexés ;
- **stockage** : quelques milliers de passages, de l'ordre de 20 Mo dans PostgreSQL (pgvector) ;
- le vrai coût est donc celui des **réponses** (ci-dessous), pas celui de la base.

**Découpage réel (mesuré le 02/10/2026, `pnpm --filter @bgs/api assistant:passages`)** : la base est désormais découpée en passages traçables (lien officiel, date, version), sans traduction automatique ni article retiré :
- 5 866 passages, environ 860 caractères chacun : 4 380 issus des articles, 1 486 des démarches (avec leurs pièces, coût, délai, lieux et questions fréquentes, tels que la fiche les montre) ;
- 5 094 en français, 772 en wolof ;
- une **recherche par mots** (BM25, gratuite, sans service extérieur) retrouve ces passages en quelques millisecondes. Elle suffit quand la question reprend les mots de la source (« Le président a-t-il visité la Chine ? », « Quelles pièces pour un extrait de naissance ? »), mais pas quand elle les reformule (« Combien coûte… » ne trouve pas « Coût »). La recherche par le sens (vecteurs) complétera la recherche par mots une fois le modèle d'indexation choisi.

**Mesure de référence (02/10/2026, `pnpm --filter @bgs/api assistant:eval`)** : 38 questions en français, chacune reliée à la page officielle qui y répond (`apps/api/data/assistant-retrieval-eval.json`, données de test internes, jamais affichées). Part des questions dont la bonne page arrive dans les 3 premières :

| Questions | Recherche par mots |
|---|---|
| Reprenant les mots de la source (22) | 86 % |
| Reformulées (16), ex. « Je veux divorcer », « Comment devenir soldat ? » | 50 % |
| Toutes (38) | 71 % |

Le même jeu mesurera chaque modèle d'indexation candidat : c'est le critère objectif proposé pour le choisir, avec son coût et son support du wolof. Le wolof n'y figure pas encore : il faut des questions écrites par des locuteurs natifs (W-01).

À noter : les modèles Claude ne font pas l'indexation. Il faut un modèle d'indexation à part, gratuit et ouvert ou payant, à choisir ; son support du wolof sera vérifié par le banc d'essai W-02.

### Coût estimé (à valider)
Prix publics relevés en septembre 2026 ([pecollective.com](https://pecollective.com/tools/anthropic-api-pricing/), [benchlm.ai](https://benchlm.ai/anthropic/api-pricing)), par million de jetons :

| Modèle | Entrée | Sortie |
|---|---|---|
| Claude Haiku 4.5 | 1 $ | 5 $ |
| Claude Sonnet 5 | 2 $ | 10 $ |

**Hypothèse de calcul** (à confirmer par une mesure réelle) : une question coûte environ 3 000 jetons d'entrée (les passages officiels) et 300 de sortie.
- Avec Haiku 4.5 : environ 0,0045 $, soit environ 3 F CFA par question.
- Avec Sonnet 5 : environ le double.

Par exemple, 500 000 questions par mois avec Haiku coûteraient environ 2 250 $ par mois. Trois leviers baissent ce coût :
- le cache des consignes (jusqu'à 90 % de moins sur la partie répétée) ;
- la réponse directe aux questions fréquentes depuis une mémoire de réponses déjà vérifiées ;
- une limite d'usage par installation.

**Tout coût engagé demande votre validation explicite.**

### Voix et wolof
- **Lecture en français** : déjà faite avec la voix du téléphone, gratuite.
- **Wolof, voix et compréhension** :
  - **AWA (Andakia)**, startup sénégalaise : API de transcription et de synthèse vocale en wolof ([osiris.sn](https://osiris.sn/awa-l-intelligence-artificielle-qui-parle-le-wolof-du-senegal.html), [TRT Afrika](https://trtafrika.com/insight/awa-senegalese-start-ups-ai-muse-speaks-in-wolof-18244712)). C'est la référence de qualité fixée par CLAUDE.md. Tarif à demander ; un partenariat est possible.
  - **Modèles ouverts** : un modèle Whisper adapté au wolof annonce un taux d'erreur de 17 % sur sa page ([Hugging Face](https://huggingface.co/M9and2M/whisper-small-wolof/commit/b9153193c0678d5da36071c70f6c1ecf1a8801bf)). La synthèse vocale de Meta (MMS) est sous licence **CC-BY-NC** (pas d'usage commercial, [Hugging Face](https://huggingface.co/facebook/mms-tts)) : une vérification juridique s'impose pour un service public.
  - Le banc d'essai wolof (W-02) départagera ces solutions sur nos propres contenus, comme vous l'avez prévu.

### Options
- **A. Assistant texte en français d'abord (recommandé)** : RAG sur notre base, citations, « Est-ce vrai ? », petit modèle économique, coût mesuré sur un pilote. Le wolof écrit et la voix viennent après le banc d'essai W-02.
- **B. Texte et voix, français et wolof d'un coup**, via un partenaire (AWA). Plus rapide côté wolof, mais dépendant d'un tiers et de son tarif.
- **C. « Est-ce vrai ? » seul d'abord** : le plus utile contre les fausses informations, et un périmètre plus étroit, donc plus sûr.

### Questions à trancher
1. Par quoi commence-t-on : l'assistant, « Est-ce vrai ? », ou les deux ?
2. Quel budget mensuel maximal pour l'IA au pilote ?
3. Conserve-t-on les questions posées, anonymisées, pour améliorer les réponses ? Combien de temps ?
4. « Un agent peut prendre le relais » : y a-t-il des agents, et sur quel canal ?
5. Wolof : contacte-t-on Andakia (AWA) maintenant, ou après le banc d'essai ?
6. Quel fournisseur de modèle (et quelle région d'hébergement des données) êtes-vous prêt à valider ?

---

## 4. Ce que chaque option demande à construire

Estimation de Claude, en taille relative : **petite** (quelques heures à une journée), **moyenne** (quelques jours), **grosse** (une semaine ou plus, avec des dépendances extérieures). Chaque option garde les exigences habituelles : tests, accessibilité, parcours de bout en bout, journal d'audit.

| Option | Ce qu'il faut construire | Taille | Dépend de |
|---|---|---|---|
| Opportunités B (saisie dans la console) | Fiche « opportunité » (type, organisme, date limite, lien officiel obligatoire) ; saisie et validation à deux personnes dans la console ; écran de l'app avec filtres et tri par date limite ; annuaire des portails | Moyenne | Vos choix de catégories et de sources |
| Opportunités A (collecte), par portail | Adaptateur de collecte, contrôle et quarantaine, comme pour presidence.sn ; surveillance dans la console | Moyenne pour DER/FJ ou ADEPME ; bloquée pour marchespublics.sn tant que son certificat n'est pas réglé | Accord des organismes, règles des sites |
| Rappel avant la clôture | Notification, sur accord de la personne, quelques jours avant la date limite | Petite (le système de notifications existe) | Option B ou A |
| Participer A (sondages) | Sondage préparé et validé à deux dans la console, avec charte ; vote anonyme d'un toucher (une voix par installation, limite de débit) ; résultats agrégés | Moyenne | Charte éditoriale, qui rédige |
| Signalements | Photo (avec floutage des visages et des plaques), position, catégorie ; modération ; transmission à l'organisme et suivi | Grosse | Organisme partenaire, déclaration CDP, durée de conservation |
| Assistant A (texte, français) | Indexation de la base ; recherche des passages ; adaptateur du fournisseur de modèle ; réponses avec citations ; jeu de test « zéro invention » ; garde-fous (périmètre, neutralité) ; suivi du coût dans la console | Grosse | Fournisseur et budget validés |
| « Est-ce vrai ? » seul (C) | Même socle que l'assistant, avec un format de réponse plus simple | Moyenne à grosse | Idem |
| Voix et wolof | Banc d'essai W-02, puis intégration du fournisseur retenu | Grosse | Locuteurs natifs pour le test d'écoute, partenaire éventuel |
