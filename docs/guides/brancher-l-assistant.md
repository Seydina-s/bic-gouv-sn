# Brancher l'assistant (clé d'accès Claude)

L'assistant de l'application (questions et « Est-ce vrai ? ») est prêt. Il lui manque seulement la **clé d'accès** d'un compte Anthropic, l'entreprise qui fournit Claude. Sans cette clé, l'application indique que l'assistant n'est pas encore disponible, et tout le reste fonctionne normalement.

La clé est un secret, comme un mot de passe. **Vous seul** la créez et la saisissez. Ne l'envoyez jamais dans une conversation, un courriel ou une capture d'écran.

## 1. Créer le compte et fixer un plafond de dépense

1. Ouvrez https://console.anthropic.com et créez un compte (adresse de l'équipe de préférence).
2. Dans la partie facturation, ajoutez un moyen de paiement et un premier crédit. Le service est **prépayé** : il s'arrête quand le crédit est épuisé.
3. Dans les limites du compte, fixez une **limite de dépense mensuelle**, par exemple 40 $. C'est le second garde-fou, après la limite de questions réglée dans la console.

## 2. Créer la clé

1. Dans la partie « API Keys », créez une clé nommée par exemple `bic-gouv-sn-assistant`.
2. Elle s'affiche **une seule fois** : gardez la fenêtre ouverte pour l'étape suivante.

## 3. La saisir sur le serveur

**En local**, sur l'ordinateur où tourne l'API :

1. Ouvrez le fichier `apps/api/.env.local` avec un éditeur de texte (créez-le s'il n'existe pas).
2. Ajoutez une ligne `ANTHROPIC_API_KEY=` suivie de la clé collée, sans espace ni guillemets.
3. Enregistrez, puis redémarrez l'API.

**En production**, la clé va dans le gestionnaire de secrets de l'hébergeur, sous le même nom `ANTHROPIC_API_KEY`, jamais dans le code.

## 4. Vérifier

- Dans la console d'administration, la page **Assistant** n'affiche plus l'avis « pas encore branché ».
- Dans l'application, posez une question sur une démarche : la réponse arrive avec ses sources.

## Ce que cela coûte

- Modèle : Claude Haiku 4.5, le moins cher qui réponde assez bien.
- Une question coûte environ **0,003 $** : la question, les règles et six extraits officiels sont lus, puis une réponse courte est écrite. C'est une estimation : la page **Assistant** de la console affiche le coût réel du mois.
- Avec la limite actuelle de **10 000 questions par mois**, le maximum est d'environ **30 $ par mois**. Au-delà, l'assistant se met en pause jusqu'au 1er du mois suivant, avec un message aimable.
- Une question dont aucun mot ne se retrouve dans les publications officielles ne coûte rien : le modèle n'est pas appelé.

## En cas de problème

- La console affiche « L'assistant n'a pas pu obtenir de réponse » dans **Erreurs** : vérifiez que la clé est bien saisie et que le crédit n'est pas épuisé.
- Pour couper l'assistant immédiatement : console → **Contrôle à distance** → décocher « Assistant ».
- Clé exposée par erreur : supprimez-la dans la console Anthropic, créez-en une autre et remplacez-la dans `apps/api/.env.local`.
