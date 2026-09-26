# Restaurer les données après un incident

**Quand ?** Le fichier des articles (`.data/news.json`) est illisible ou vide, et sa copie de secours `.data/news.json.bak` aussi.

1. Arrêter la collecte (surveillance) et l'API.
2. Mettre de côté le fichier abîmé : `.data/news.json` → `.data/news.json.abime-AAAA-MM-JJ`.
3. Prendre la copie du jour le plus récent dans `.data/backups/AAAA-MM-JJ/news.json` et la copier en `.data/news.json`.
4. Relancer l'API, puis la surveillance : elle rattrape d'elle-même les articles publiés depuis la copie (reprise automatique, sans doublon).
5. Vérifier dans l'administration, carte « Collecte des actualités », que les actualités se mettent à jour.

**Si aucune copie n'est utilisable** : relancer l'import complet (`pnpm --filter @bgs/ingestion backfill fr`, puis `backfill wo`, `covers fr`, `covers wo`, `inline-images`). Les photos déjà présentes sur le disque sont réutilisées.

Les copies quotidiennes (7 derniers jours) restent sur la même machine : une copie hors machine sera mise en place avec l'hébergement (S1-02).
