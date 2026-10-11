# Créer le serveur d'IA (Hetzner)

Le serveur d'IA lit les articles à voix haute (Kokoro en français, Adia en wolof). Plus tard, il accueillera aussi la recherche par le sens et la reconnaissance du wolof.

C'est un serveur **Hetzner CPX32** : 4 processeurs AMD, 8 Go de mémoire, 160 Go de disque, à Helsinki. Il coûte **41,99 $ par mois**, plus 0,60 $ pour l'adresse IPv4, soit **42,59 $** (prix affiché à la commande le 10/10/2026).

**Serveur créé par l'utilisateur le 10/10/2026.** Hetzner a augmenté ses prix le 15/06/2026, et la gamme « Cost-Optimized » (CX43, prévue au départ à environ 16 €) est signalée en disponibilité limitée. Le CPX22 (4 Go) est trop petit : la mesure du 10/10 montre 4,9 Go de mémoire occupés pendant la lecture en wolof.

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
   - **Type** : **Regular Performance**, puis **CPX32** (4 vCPU, 8 GB RAM) ;
   - **Networking** : laissez **Public IPv4** coché ;
   - **SSH keys** : choisissez **Add SSH key** et collez tout le contenu du fichier `cle-publique-serveur-ia.txt`, posé sur votre Bureau. Il commence par `ssh-ed25519`. Nommez la clé `claude-bic-gouv` ;
   - **Volumes**, **Firewalls**, **Backups**, **Placement groups**, **Labels**, **Cloud config** : ne touchez à rien. Claude ferme lui-même tous les accès inutiles ;
   - **Name** : `bic-gouv-ia`.
4. Vérifiez le prix affiché en bas de la page, puis validez avec **Create & Buy now**. Le serveur démarre en moins d'une minute.

## 3. Donner l'adresse du serveur

Ce qui a été fait le 10/10/2026 : pare-feu (seule la connexion par clé est ouverte), mot de passe refusé, mises à jour de sécurité automatiques, protection contre les essais répétés (fail2ban), compte `voices` sans droits d'administration pour les voix.

Dans la liste des serveurs du projet, copiez l'**adresse IPv4** de `bic-gouv-ia` (quatre nombres séparés par des points) et donnez-la à Claude. Ce n'est pas un secret.

Claude installe alors les voix, ferme tout accès autre que la clé, puis lance la lecture des articles.

## Ce qu'il faut savoir

- **Facturation** : Hetzner compte à l'heure, sans dépasser le prix mensuel du serveur. Un serveur supprimé en cours de mois ne coûte que les heures utilisées.
- **Processeurs partagés** : les 4 processeurs du CPX32 sont partagés avec d'autres clients. Claude mesure la vitesse réelle des voix les premiers jours.
  - Si elle est insuffisante, le serveur peut passer à un modèle plus fort, avec **Rescale** dans la console, sans rien réinstaller.
  - Ce changement modifie le prix : il vous sera soumis avant.
- **Wolof** : la lecture d'un article prend des dizaines de minutes de calcul sans carte graphique. Le serveur n'est pas plus rapide que l'ordinateur de développement, mais il tourne jour et nuit sans l'occuper.
- **Vitesse mesurée le 10/10/2026** (un article de la Présidence d'environ 1 400 caractères) :
  - français : Jessica, 7 secondes de calcul pour 1 min 40 s d'écoute ; Kokoro (retenue le 10/10), 28 secondes pour 1 min 44 s, soit environ 1 jour et demi pour les 3 375 articles ;
  - wolof (Adia) : 19 min de calcul pour 2 min d'écoute ; les 693 articles en wolof sans voix en environ 16 jours de calcul continu, dont environ 10 jours pour les 378 publiés depuis octobre 2025.
- **Mémoire** : la lecture en wolof monte à 7 Go sur 7,6 Go. Une mémoire de secours de 4 Go a été ajoutée sur le disque.
- **Arrêter les frais** : dans la console, ouvrez `bic-gouv-ia`, puis **Delete**. Arrêter le serveur (**Power off**) ne suffit pas : un serveur arrêté reste facturé. Les enregistrements déjà faits restent sur notre stockage.
