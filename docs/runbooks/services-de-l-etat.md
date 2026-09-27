# Services de l'État : import, vérification, pannes

La carte « Près de moi » ne montre **que des services vérifiés par une personne** dans la console. Les données de départ viennent d'OpenStreetMap ; rien n'est publié sans vérification (CLAUDE.md §1).

## Vérifier des services (équipe, sans connaissance technique)

1. Se connecter à la console, menu **Services de l'État**.
2. Choisir la zone (**Région de Dakar** d'abord, la zone pilote) et une catégorie à gauche.
3. Pour chaque service : **Voir sur la carte** (OpenStreetMap s'ouvre dans un nouvel onglet) et contrôler le nom et l'emplacement.
   - Nom ou type faux (un commissariat rangé en « mairie ») : **Corriger**, puis revenir à la liste.
   - Indice « probablement pas un service de l'État » (entreprise, banque…) : en général à **écarter**.
   - Indice « nom trop général » : bien vérifier l'emplacement sur la carte.
4. Cocher les services contrôlés, puis **Vérifier les services cochés** (ils apparaissent dans l'application) ou **Écarter les services cochés**.

Chaque décision et chaque correction sont inscrites au journal d'audit. Une correction n'est jamais annulée par un nouvel import.

### Déplacer un service mal placé

1. **Corriger** sur la ligne du service.
2. Trouver l'emplacement exact sur https://www.openstreetmap.org (ou Google Maps), puis copier :
   - sur OpenStreetMap : clic droit sur le bâtiment → « Afficher l'adresse » ou « Centrer la carte ici », puis copier l'adresse de la page ;
   - sur Google Maps : clic droit sur le point → cliquer sur les coordonnées affichées (elles sont copiées).
3. Coller dans le champ **Emplacement** (un lien ou des coordonnées « latitude, longitude », par exemple `14.6928, -17.4467`), puis **Enregistrer la correction**.
4. **Voir cet emplacement sur la carte** permet de contrôler le résultat.

La console refuse un emplacement illisible ou hors du Sénégal (souvent la latitude et la longitude inversées : la latitude, entre 12 et 17, vient en premier). L'emplacement de la source reste affiché pour mémoire.

### Ajouter un service absent de la liste

1. Sur la page **Services de l'État** : **Ajouter un service absent de la liste**.
2. Saisir le nom, le type et l'emplacement (même principe que ci-dessus : coordonnées ou lien de carte) ; l'adresse et le téléphone sont facultatifs.
3. **Ajouter le service** : il rejoint la liste « À vérifier » de sa catégorie. Il n'apparaît dans l'application qu'une fois vérifié, comme les services importés. Aucun import ne le supprime.

**Mise en service** : l'API doit être mise à jour avant la console. Face à une API plus ancienne, la console ne fait pas croire au déplacement : elle affiche « Nom et type enregistrés, mais pas l'emplacement ».

## Relancer l'import (équipe technique)

```
pnpm --filter @bgs/ingestion services:osm
```

- Une seule requête vers l'API publique Overpass ; rejouable sans doublon (identifiant = objet OpenStreetMap).
- Un service **proposé** suit sa source ; un service **vérifié** garde ses données vérifiées : le changement de la source est mis de côté et apparaît dans la console (« Changés à la source depuis leur vérification ») jusqu'à une nouvelle vérification.
- Les services que la source ne connaît plus restent en place : rien n'est supprimé automatiquement.

## Pannes

| Ce qu'on voit | Cause probable | Que faire |
|---|---|---|
| L'import s'arrête sur « Source unreachable: https://overpass-api.de/… » | Overpass surchargé ou réseau coupé (le disjoncteur s'est ouvert après 3 échecs) | Relancer plus tard ; ne pas insister (usage raisonnable de l'API publique) |
| L'import s'arrête sur « Quarantined … unexpected Overpass response » | Réponse d'un format inattendu | Ne rien publier ; regarder la réponse, adapter `services/ingestion/src/sources/osm/overpass.ts` si le format a changé |
| « Près de moi » affiche « Les services de l'État arrivent bientôt ici » | Aucun service vérifié | Vérifier des services dans la console |
| Un service vérifié a disparu de l'application | Il a été écarté, ou le fichier `.data/state-services.json` a été remplacé | Consulter le journal d'audit ; restaurer le fichier depuis une copie si besoin |

## Licence

Données OpenStreetMap sous licence **ODbL** : l'attribution « © les contributeurs d'OpenStreetMap » est affichée dans l'application et dans la console. Une base publiée qui mélange OpenStreetMap et nos saisies doit pouvoir être partagée sous la même licence : point à valider avec le BIC (L-03).
