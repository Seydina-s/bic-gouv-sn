# Hébergement : options et chiffrage (S1-02)

Document de décision pour l'utilisateur. Le budget est **sa** décision (CLAUDE.md : tout coût est validé explicitement). Prix relevés le **29/09/2026** sur les pages officielles citées, hors taxes. Ils évoluent : à revérifier le jour de la commande. Aucun chiffre n'est estimé sans le dire.

## Ce qu'il faut héberger

| Élément | Besoin | Source du besoin |
|---|---|---|
| API (publique + console) | 1 petite machine au départ, 2 après SCALE-01 (voir plus bas) | `infra/docker/api.Dockerfile`, `docs/capacite.md` |
| Console | 1 petite machine (peu d'utilisateurs) | `infra/docker/console.Dockerfile` |
| Collecte en temps réel | 1 petite machine, **une seule instance** | `infra/docker/ingestion.Dockerfile` |
| Base PostgreSQL (prévue au stack) | Petite au départ, avec secours | CLAUDE.md §4.1 |
| Fichiers publics (photos, PDF, fond de carte) | Stockage objet + CDN | Volume : voir « Volumes mesurés » |
| CDN + pare-feu applicatif (WAF) | Au plus près du Sénégal | CLAUDE.md §4.5 |

Le trafic massif (après un Conseil des ministres) porte sur des réponses publiques et cachables. **Le CDN en sert l'essentiel**, et l'API ne reçoit que les rafraîchissements. Sur une seule machine de développement, l'API tient environ 630 requêtes par seconde sur la liste des articles (`docs/capacite.md`).

## Volumes mesurés (29/09/2026)

- Médias (photos originales et leurs variantes, PDF officiels) : **1,6 Go** pour 970 articles.
- Fond de carte du Sénégal (tuiles) : **208 Mo**. Styles et icônes de la carte : 2,1 Mo.
- Total des fichiers publics : **environ 1,8 Go**. Il grandit avec les nouvelles publications, sans estimation de rythme fiable à ce stade : à suivre mois par mois.

## Option A : Europe (Paris) + CDN avec point de présence à Dakar (recommandée pour démarrer)

- **CDN et WAF : Cloudflare.** Cloudflare a un point de présence **à Dakar** : les réponses en cache partent de Dakar même ([CDN Planet](https://www.cdnplanet.com/geo/senegal-cdn/), [OpenStatus – Dakar DKR](https://www.openstatus.dev/status/cloudflare/dakar-senegal-dkr)). Les offres incluent toutes le CDN, le WAF (règles gérées gratuites) et la protection DDoS sans limite de volume ([tarifs Cloudflare](https://www.cloudflare.com/plans/network-cdn/)).
  - Gratuit : 0 $.
  - Pro : 20 $/mois (payé à l'année) ou 25 $/mois.
  - Business : 200 $/mois (à l'année) ou 250 $/mois.
- **Stockage objet : Cloudflare R2**, sans frais de sortie de données ([tarifs R2](https://developers.cloudflare.com/r2/pricing/)).
  - 0,015 $ par Go et par mois ; 10 Go gratuits par mois.
  - Lectures : 0,36 $ par million, 10 millions gratuites par mois. Écritures : 4,50 $ par million, 1 million gratuit par mois.
  - « Egress : Free ».
- **Machines et base : Scaleway, région Paris** ([instances](https://www.scaleway.com/en/pricing/virtual-instances/), [bases gérées](https://www.scaleway.com/en/pricing/managed-databases/)).
  - Instances DEV1-S (2 vCPU, 2 Go) : ~6,55 €/mois. DEV1-M (3 vCPU, 4 Go) : ~14,74 €/mois.
  - PostgreSQL géré DB-DEV-S (2 vCPU, 2 Go) : ~11,45 €/mois ; haute disponibilité : +~5,48 €/mois.
  - Stockage de la base : 0,0993 €/Go/mois. Sauvegardes : 0,03 €/Go/mois.

**Configuration de départ (pilote puis lancement national) :**

| Poste | Choix | Prix mensuel relevé |
|---|---|---|
| API | 1 × DEV1-M au départ (voir la limite ci-dessous) | ~14,74 € |
| Console + collecte | 2 × DEV1-S | ~13,10 € |
| PostgreSQL | DB-DEV-S + haute disponibilité + 20 Go | ~11,45 € + ~5,48 € + ~1,99 € = ~18,92 € |
| Stockage objet | R2, sous les 10 Go gratuits d'après les volumes mesurés | 0 $ tant que le volume reste sous 10 Go |
| CDN + WAF | Cloudflare Pro (règles WAF plus complètes que l'offre gratuite) | 20 $ (à l'année) |
| **Total** | | **~46,76 € + 20 $ par mois**, soit **environ 65 € par mois** (conversion approximative) |

**Limite à lever avant une seconde instance de l'API (audit du 29/09, SCALE-01).** Aujourd'hui, chaque instance garde en mémoire :
- les sessions et les étapes de connexion de la console ;
- les clés anti-doublons ;
- les compteurs (statistiques, recherches sans résultat, journal des erreurs), qu'elle écrit ensuite dans un fichier partagé.

Avec deux instances, une personne connectée sur l'une serait refusée par l'autre, et les compteurs s'écraseraient. On démarre donc avec **une instance** : derrière le CDN, elle suffit au départ, car elle tient environ 630 requêtes par seconde sur une machine de développement. Ces états passeront dans PostgreSQL ou Redis, tous deux prévus au stack, avant d'en ajouter une seconde (+~14,74 €/mois).

À ajouter, non chiffré ici : nom de domaine, sauvegardes hors machine sur un second fournisseur (quelques euros par mois pour quelques Go), Sentry (offre gratuite en place).

**À 20 millions d'installations**, trois postes augmentent :
1. Le nombre de machines de l'API, seulement si le cache ne suffit pas. On l'augmente en mesurant (test de charge k6, phase 7). Chaque DEV1-M de plus : ~14,74 €/mois.
2. Les lectures R2 non servies par le cache : 0,36 $ par million au-delà de 10 millions gratuites. Par exemple, **si** 50 millions de lectures par mois atteignaient R2 malgré le cache : (50 − 10) × 0,36 $ = 14,40 $/mois.
3. Éventuellement l'offre Cloudflare Business (200 $/mois à l'année), pour un support et des garanties plus forts au lancement national.

Ces coûts restent faibles parce que le CDN ne facture pas la bande passante et que R2 ne facture pas la sortie de données. C'est le principal levier d'économie.

## Option B : cloud américain en Afrique (AWS Le Cap, Google Johannesburg)

- Avantage : données sur le continent.
- Limites :
  - Le Cap et Johannesburg sont loin de Dakar par les câbles sous-marins. Les grands câbles de la côte ouest (ACE, SAT-3, 2Africa) relient Dakar à l'Europe **et** à l'Afrique australe ([ACE](https://en.wikipedia.org/wiki/Africa_Coast_to_Europe_(cable_system))).
  - Le délai de réponse doit être **mesuré depuis Dakar** avant de choisir. Je n'ai pas trouvé de mesure publique fiable Dakar–Le Cap contre Dakar–Paris.
  - La sortie de données y est facturée, ce qui pèse à grande échelle.
- Prix : non relevés ici (pages de tarifs interactives) ; à chiffrer si l'option est retenue.

## Option C : souveraine, datacenter national de Diamniadio (Sénégal Numérique)

- Datacenter de l'État, Tier 3, inauguré en 2021, conçu pour héberger les données de l'administration ([Data Center Map](https://www.datacentermap.com/senegal/dakar/diamniadio-national-datacenter/), [DCD](https://www.datacenterdynamics.com/en/news/senegal-to-migrate-all-government-data-and-applications-to-new-government-data-center/), [CIO Mag](https://cio-mag.com/datacenter-national-le-senegal-affirme-sa-souverainete-numerique/)).
- Atouts : **souveraineté** (données au Sénégal), cohérence avec une application gouvernementale, latence minimale pour les citoyens.
- Tarifs : **non publics**, à demander à Sénégal Numérique SA. La question est à ajouter à celles pour le BIC (point 6 de la liste en attente).
- Le CDN (Cloudflare, point de présence à Dakar) reste utile devant, contre les pics et les attaques.

## Recommandation

1. **Démarrer avec l'option A** : environ 65 € par mois, conteneurs déjà prêts, CDN à Dakar, aucun frais de bande passante. Aucun engagement long.
2. **Demander en parallèle une offre à Sénégal Numérique (option C).** Si elle est acceptable, migrer : les conteneurs rendent ce changement simple.
3. Avant tout choix, **mesurer la latence réelle** depuis un téléphone à Dakar vers Paris et vers les autres régions candidates (quelques minutes, sans coût).

**Décision attendue de l'utilisateur** : l'option, et le budget mensuel.
