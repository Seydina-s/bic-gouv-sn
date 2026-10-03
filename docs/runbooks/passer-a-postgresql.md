# Passer les contenus dans la base PostgreSQL

**Quand ?** Une fois, à la mise en place de l'hébergement (S1-02), avant de faire tourner plusieurs serveurs d'API. Tant que `DATABASE_URL` n'est pas réglée, tout reste dans les fichiers de `.data/`, comme aujourd'hui.

**Ce qui passe en base** : les articles et les démarches, avec toutes leurs versions précédentes ; les thèmes des démarches ; les services de l'État ; le contrôle à distance de l'application ; le rapport de la collecte. Les compteurs, les comptes de l'équipe, les notifications, les opportunités et les messages de Participer y sont déjà dès que la base est réglée.

1. Créer la base PostgreSQL chez l'hébergeur et ranger son adresse dans le gestionnaire de secrets sous le nom `DATABASE_URL` (jamais dans un fichier du dépôt).
2. Arrêter la collecte (surveillance), pour que les fichiers ne changent plus pendant la copie.
3. Recopier les fichiers dans la base, depuis la machine qui a les fichiers de `.data/` :
   `pnpm --filter @bgs/ingestion content:import`, avec `DATABASE_URL` réglée dans l'environnement.
   La commande affiche, pour chaque contenu, combien d'éléments ont été recopiés et combien étaient déjà en base. Elle ne change jamais ce qui est déjà en base : on peut la relancer sans risque.
4. Régler `DATABASE_URL` pour l'API et pour la collecte, puis les relancer : l'API met le schéma à jour toute seule au démarrage.
5. Vérifier dans la console :
   - la carte « Collecte des actualités » se met à jour après le passage suivant ;
   - le nombre d'articles et de démarches est le même qu'avant ;
   - les services de l'État vérifiés et le contrôle à distance sont inchangés.
6. Garder les fichiers de `.data/` tels quels pendant au moins un mois : ils servent de retour arrière (retirer `DATABASE_URL` et relancer).

**Sauvegardes** : une fois en base, ce sont les sauvegardes automatiques de l'hébergeur qui comptent ; la copie quotidienne des fichiers par la collecte s'arrête d'elle-même.
