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

À vérifier ensemble : le FONGIP, qui n'est pas confirmé dans les recherches, et la liste exacte des ministères à couvrir. Les agrégateurs privés (par exemple marchesdusenegal.com) sont exclus : ce ne sont pas des sources officielles.

### Options
- **A. Collecte automatique** sur 4 à 6 portails officiels, comme pour presidence.sn : fiches normalisées (type, organisme, date limite, lien officiel), rappel avant la clôture. C'est le plus complet. Mais chaque portail a sa propre structure, et il faut l'accord de chaque organisme.
- **B. Saisie dans la console** : l'équipe ajoute les opportunités majeures depuis les portails officiels, avec une validation à deux personnes et le lien officiel obligatoire. Plus un annuaire de liens vers les portails. Rapide et fiable, mais limité par le temps de l'équipe.
- **C. Hybride (recommandé)** : on commence par B (annuaire et saisie validée), puis on passe une source à la fois en collecte automatique (A), à mesure que les accords sont obtenus. Les marchés publics d'abord : c'est le plus gros volume.

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
