# Créer le serveur d'IA (Hetzner)

Le serveur d'IA lit les articles à voix haute (Jessica en français, Adia en wolof). Plus tard, il accueillera aussi la recherche par le sens et la reconnaissance du wolof.

C'est un serveur **Hetzner CX43** : 8 processeurs, 16 Go de mémoire, en Allemagne ou en Finlande. Il coûte environ **16 € par mois**, plus environ 0,50 € pour l'adresse IPv4. Ce sont les prix relevés en octobre 2026 : le prix exact s'affiche avant la commande.

Il remplace le serveur Scaleway DEV1-XL (4 processeurs, 12 Go, ≈ 47,50 €), car Scaleway refuse les cartes virtuelles. Décision de l'utilisateur du 09/10/2026.

Vous créez le compte et le serveur. Claude installe et branche le reste à distance, avec une clé d'accès dont seule la partie publique vous est confiée. Votre identifiant et votre mot de passe Hetzner ne sont jamais demandés.

## 1. Créer le compte

1. Ouvrez https://accounts.hetzner.com/signUp, puis inscrivez-vous avec votre adresse e-mail.
2. Validez votre adresse e-mail grâce au lien reçu.
3. Remplissez vos coordonnées. Elles doivent être **exactement celles de votre carte** (nom et adresse), sinon le paiement peut être refusé.
4. Moyen de paiement : choisissez d'abord **carte bancaire** et saisissez votre carte Visa Wave. Hetzner accepte en général les cartes virtuelles rechargeables.
   - Si la carte est refusée, choisissez **PayPal**, après avoir relié votre carte Wave à un compte PayPal.
   - Avec PayPal, Hetzner envoie une facture chaque mois, à régler vous-même depuis la page de facturation.
5. **Vérification du compte** : pour un nouveau client, Hetzner demande soit une copie de pièce d'identité, soit un premier paiement d'avance par PayPal. Suivez simplement ce qui s'affiche. La validation peut prendre de quelques minutes à un jour.

## 2. Créer le serveur

1. Ouvrez la console : https://console.hetzner.com. Créez un projet nommé `bic-gouv`, puis ouvrez-le.
2. Choisissez **Add Server** (ajouter un serveur).
3. Réglez les options dans l'ordre de la page :
   - **Location** : Nuremberg, Falkenstein ou Helsinki, n'importe lequel ;
   - **Image** : **Ubuntu 24.04** ;
   - **Type** : **Shared vCPU**, puis **x86**, puis **CX43** (8 vCPU, 16 GB RAM) ;
   - **Networking** : laissez **Public IPv4** coché ;
   - **SSH keys** : choisissez **Add SSH key** et collez tout le contenu du fichier `cle-publique-serveur-ia.txt`, posé sur votre Bureau. Il commence par `ssh-ed25519`. Nommez la clé `claude-bic-gouv` ;
   - **Volumes**, **Firewalls**, **Backups**, **Placement groups**, **Labels**, **Cloud config** : ne touchez à rien. Claude ferme lui-même tous les accès inutiles ;
   - **Name** : `bic-gouv-ia`.
4. Vérifiez le prix affiché en bas de la page, puis validez avec **Create & Buy now**. Le serveur démarre en moins d'une minute.

## 3. Donner l'adresse du serveur

Dans la liste des serveurs du projet, copiez l'**adresse IPv4** de `bic-gouv-ia` (quatre nombres séparés par des points) et donnez-la à Claude. Ce n'est pas un secret.

Claude installe alors les voix, ferme tout accès autre que la clé, puis lance la lecture des articles.

## Ce qu'il faut savoir

- **Facturation** : Hetzner compte à l'heure, sans dépasser le prix mensuel du serveur. Un serveur supprimé en cours de mois ne coûte que les heures utilisées.
- **Processeurs partagés** : les 8 processeurs du CX43 sont partagés avec d'autres clients. Claude mesure la vitesse réelle des voix les premiers jours.
  - Si elle est insuffisante, le serveur peut passer à un modèle plus fort, avec **Rescale** dans la console, sans rien réinstaller.
  - Ce changement modifie le prix : il vous sera soumis avant.
- **Wolof** : la lecture d'un article prend des dizaines de minutes de calcul sans carte graphique. Avec 8 processeurs au lieu de 4, le rattrapage de l'historique devrait aller environ deux fois plus vite que prévu sur Scaleway.
- **Arrêter les frais** : dans la console, ouvrez `bic-gouv-ia`, puis **Delete**. Arrêter le serveur (**Power off**) ne suffit pas : un serveur arrêté reste facturé. Les enregistrements déjà faits restent sur notre stockage.
