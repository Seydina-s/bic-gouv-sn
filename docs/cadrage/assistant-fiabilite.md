# Programme de fiabilité de l'assistant

Demande de l'utilisateur du 17/10/2026 : l'assistant refuse des questions simples de son périmètre (« C'est quoi les actualités d'aujourd'hui ? »). Il faut un vrai programme, qui trouve la cause et la règle pour de bon, au lieu de corriger les refus un par un.

## 1. Mesure du 17/10/2026

29 questions couvrant tout le périmètre, posées à l'API réelle (18 avant la limite de 20 questions par heure et par personne). Les 11 autres ont été examinées sans le modèle, en regardant les extraits que la recherche lui aurait donnés.

| Type de question | Exemple | Résultat |
|---|---|---|
| Actualités du jour / de la semaine | « Quelles sont les actualités du jour ? », « Qu'a fait le gouvernement cette semaine ? », « What's the news today? » | **5 sur 5 refusées** |
| Dernières nouvelles en général | « Quelles sont les dernières nouvelles du gouvernement ? » | Répondu avec le discours du 31/12/2025 : **faux** (il y a des articles du jour) |
| Actualités d'une institution | « … du ministère de la Santé », « What did the Prime Minister do recently? » | Répondu, à jour |
| Conseil des ministres | « Qu'a décidé le dernier Conseil des ministres ? » | Répondu, à jour (13/10) |
| Qui occupe un poste | « Qui est le Premier ministre ? », « Who is the President? » | Répondu |
| Composition du gouvernement | « Combien de ministres compte le gouvernement ? » | Répondu avec la liste de septembre 2025 : **périmé** (nouveau Premier ministre en mai 2026) |
| Démarches | passeport, carte d'identité, extrait de naissance, entreprise | Répondu |
| DER / financement | « Comment obtenir un financement de la DER ? » | Extraits sans rapport (cérémonie de 2020, FONGIP) : **la DER n'est pas dans la base** |
| Opportunités, aide de l'app | « Quelles bourses sont ouvertes ? », « Comment changer la langue ? » | **Absentes de la base** |

## 2. Causes (communes à tous les refus)

1. **Toute question est traitée comme une recherche de mots.** « Les actualités du jour » n'est pas un texte à trouver, c'est la liste des articles publiés aujourd'hui. Cherché par mots, « actualité » trouve des titres de 2025 (« questions d'actualité au Gouvernement ») et « semaine » trouve « SEMAINE JEUNES-SIDA ». Le modèle reçoit des extraits sans rapport et dit, à juste titre, qu'il ne trouve pas.
2. **Les repérages de la question sont des listes de mots français, incomplètes.** « du jour », « quoi de neuf » et « actualités » n'y sont pas, et rien n'existe en anglais ni en wolof.
3. **Une partie du périmètre n'est pas dans la base de l'assistant.** Elle ne contient que les articles, les fiches des démarches et les services vérifiés. Les pages de la DER (der.sn), les opportunités et l'aide de l'app n'y sont pas, alors que l'app les affiche.
4. **Les 8 extraits donnés au modèle sont souvent plusieurs morceaux d'une même page** (jusqu'à 4 sur 8), donc peu de sources différentes.
5. **Rien ne mesure si une réponse est juste et à jour.** Les jeux d'essai existants (72 questions de recherche, 21 pièges « zéro invention ») ne vérifient ni les actualités du jour, ni la DER, ni l'anglais ou le wolof. Ils ne mesurent pas non plus qu'une réponse cite la version la plus récente. Et les questions restées sans réponse chez les vrais utilisateurs ne sont pas relevées.
6. **Les questions écrites comme on parle trouvent mal leur page.** Sur le jeu d'essai de la recherche (108 questions, mesure du 17/10 par les mots seuls), la bonne page est dans les 5 premières pour 98 % des questions écrites avec les mots de la source, mais seulement pour 70 % des questions de citoyens et 66 % des questions reformulées (« dernier cm », « kom on fait pr avoir un pasport », wolof). La reformulation en recherche française n'est faite que pour une question hors du français, ou dont aucun mot n'est connu.

## 3. Programme

### Étape 1 — Régler les causes (gratuit, à faire tout de suite)

- **Aiguillage par type de question**, en français, en anglais et en wolof :
  - **actualités d'une période** (aujourd'hui, hier, cette semaine, les dernières) : les articles de la période, du plus récent au plus ancien, toutes institutions confondues, ou celle nommée. Si rien n'a été publié aujourd'hui, l'assistant le dit et donne les plus récents avec leur date ;
  - **qui / composition** : toujours la version la plus récente d'abord ;
  - **démarche, service, DER, opportunité, aide de l'app** : les pages de ce type ;
  - le reste : la recherche actuelle (mots et sens).
- **Base complétée** : pages de la DER, opportunités ouvertes et aide de l'app (tirée des textes de l'app, rien d'inventé), chacune citée avec son lien. L'app apprend d'abord à afficher ces nouvelles sources (mise à jour à distance), puis l'API les envoie.
- **Diversité des extraits** : au plus 2 morceaux par page parmi les 8.
- **Reformulation systématique** (cause 6) : chaque question est aussi reformulée en recherche française claire avant la recherche (abréviations, fautes, wolof), par un petit modèle rapide. **Coût : un second appel court par question, ≈ + 20 à 30 % du coût d'une question** ; le plafond mensuel reste celui de la console. À valider avant d'être activé.

### Étape 2 — Mesurer en continu (coût à valider)

- **Banc d'essai d'environ 150 questions**, couvrant chaque type × français et anglais (le wolof avec les relecteurs natifs, AST-26). Une partie est fabriquée à partir de la base elle-même (une question par article récent, par fiche, par service vérifié), pour suivre la base sans entretien.
- **Contrôles automatiques**, sans juge humain à chaque passage :
  - **questions qui ont une réponse dans la base** : répondre et citer la bonne page ;
  - **actualités** : citer un article de la période, ou dire qu'il n'y en a pas ;
  - **questions sur la composition du gouvernement** : citer la source la plus récente ;
  - **pièges** : ne rien inventer (les 21 questions actuelles, gardées).
- **Objectifs** :
  - **95 % de réponses justes** sur les questions qui ont une réponse dans la base ;
  - **100 %** des pièges refusés ;
  - un résultat affiché dans la console à chaque passage.
- **Quand** : avant chaque changement de l'assistant, et une fois par semaine. **Coût estimé : ≈ 1 $ par passage (Sonnet 5.5), soit ≈ 4 à 5 $ par mois.**

### Étape 3 — Apprendre des vrais utilisateurs (choix à faire)

Sans relevé, on ne voit que ce qu'on pense à tester. Trois options, de la plus discrète à la plus utile :
- **(a)** compter seulement les refus par type de question (aucun texte gardé) ;
- **(b)** garder le texte des questions refusées, pseudonymisé, 90 jours, visible dans la console comme les recherches sans résultat. Une question peut contenir un nom, d'où cette durée limitée et l'information dans la politique de confidentialité ;
- **(c)** comme (b), mais seulement quand la personne touche « Signaler cette réponse ».

Chaque semaine, les refus relevés deviennent des cas du banc d'essai : une erreur vue une fois est testée pour toujours.

## 4. Décisions attendues

1. Lancer l'étape 1 (gratuite) : demandée le 17/10, **commencée** (actualités d'une période et diversité des extraits faites le 17/10, voir le backlog AST-30a).
2. Reformulation systématique (≈ + 20 à 30 % par question) : accord ou non.
3. Étape 2 : accord sur ≈ 4 à 5 $ par mois pour le banc d'essai hebdomadaire.
4. Étape 3 : choix entre (a), (b) et (c).
