# Créer le serveur d'IA (Scaleway)

Le serveur d'IA lit les articles à voix haute (Jessica en français, Adia en wolof). Plus tard, il accueillera aussi la recherche par le sens et la reconnaissance du wolof. C'est le « serveur d'IA » du devis : **Scaleway DEV1-XL** (4 processeurs, 12 Go de mémoire, Paris), environ **47,50 € par mois** hors taxes. Décision de l'utilisateur du 09/10/2026.

Vous créez le compte et le serveur ; Claude installe et branche le reste à distance, avec une clé d'accès dont seule la partie publique vous est confiée. Votre identifiant et votre mot de passe Scaleway ne sont jamais demandés.

## 1. Créer le compte

1. Ouvrez https://www.scaleway.com et choisissez **S'inscrire** (ou « Sign up »).
2. Validez votre adresse e-mail, puis ajoutez un moyen de paiement dans **Facturation**.
3. Toujours dans **Facturation**, créez une **alerte de consommation** à 60 € par mois : vous serez prévenu bien avant tout dépassement.

## 2. Créer le serveur

1. Dans la console, ouvrez **Instances**, puis **Créer une instance**.
2. Choisissez :
   - **Zone** : Paris 1 (PAR 1) ;
   - **Type** : **DEV1-XL** ;
   - **Image** : **Ubuntu 24.04** ;
   - **Nom** : `bic-gouv-ia`.
3. À l'étape **Clés SSH**, choisissez **Ajouter une clé**, puis collez tout le contenu du fichier `cle-publique-serveur-ia.txt`, posé sur votre Bureau. Il commence par `ssh-ed25519`.
4. Validez avec **Créer une instance**. Le serveur démarre en une à deux minutes.

## 3. Donner l'adresse du serveur

Dans la fiche de l'instance, copiez son **adresse IP publique** (quatre nombres séparés par des points) et donnez-la à Claude. Ce n'est pas un secret.

Claude installe alors les voix, ferme tout accès autre que la clé, puis lance la lecture des articles.

## Ce qu'il faut savoir

- **Wolof** : sur ce serveur sans carte graphique, environ 45 minutes de calcul par article, soit **trois semaines environ** pour tout l'historique, puis quelques heures par mois pour les nouveaux articles. L'option « carte graphique » du devis (≈ 100 €, une fois) accélérerait ce rattrapage ; elle n'est pas engagée.
- **Français** : environ 30 secondes par article.
- **Arrêter les frais** : pour supprimer l'instance, ouvrez Instances, choisissez `bic-gouv-ia`, puis Supprimer. Les enregistrements déjà faits restent sur notre stockage.
