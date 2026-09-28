# Procédure — La collecte des actualités signale un problème

Alertes concernées dans la console (carte « Collecte des actualités », journal des erreurs) :
`INGESTION_SOURCE_UNREACHABLE` (le site de la Présidence ne répond pas), `INGESTION_STOPPED` (la collecte ne tourne plus), `INGESTION_QUARANTINED` (un article reçu est mal formé).

## Ce que fait la collecte toute seule

- **Elle ne s'arrête jamais sur une panne du site.** Elle réessaie après 1 min, puis 2 min, 5 min, et ensuite **toutes les 10 minutes**, sans limite de durée. La console affiche l'heure du prochain essai.
- **Au retour du site, elle rattrape tout** : elle relit la liste officielle page après page jusqu'au premier article déjà connu (jusqu'à 20 pages, soit 200 articles), donc rien de ce qui a été publié pendant la panne n'est perdu.
- Un article mal formé est mis de côté (quarantaine) sans bloquer les autres ; il est relu au passage suivant.

## Que faire

1. **Site injoignable** (alerte rouge avec « nouvel essai automatique à … ») : rien à faire, sauf si la panne dure plus d'une journée. Vérifier alors dans un navigateur que https://www.presidence.sn/fr/ s'ouvre ; si le site est ouvert mais la collecte échoue toujours, son adresse ou son format a pu changer : prévenir l'équipe technique.
2. **Collecte arrêtée** (« aucune vérification depuis 15 min ») : la collecte elle-même ne tourne plus (machine redémarrée, processus arrêté). La relancer : `pnpm --filter @bgs/ingestion watch`. Au redémarrage, elle rattrape d'elle-même les publications manquées. Si elle répond « Another watcher is already running », une collecte tourne déjà : ne pas en lancer une seconde (le fichier de données n'admet qu'un seul écrivain) ; si ce processus est bloqué, l'arrêter d'abord (il apparaît avec `cli/watch.ts` dans la liste des processus).
3. **Après une longue interruption** (plus de 200 articles publiés, cas exceptionnel) : lancer la reprise complète `pnpm --filter @bgs/ingestion backfill fr` puis `backfill wo` (sans risque : ce qui est déjà stocké est reconnu).

## Limite connue

La collecte suit le site sur son nom de domaine actuel (`presidence.sn`, API `bo-admin.presidence.sn`). Si la Présidence change de domaine ou d'API, l'adaptateur doit être mis à jour (voir `docs/sources.md`) ; un accord de flux officiel avec le BIC (point L-02) supprimerait ce risque.
