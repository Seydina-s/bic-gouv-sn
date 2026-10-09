# Faire reconnaître Bic Gouv SN par Meta (Facebook)

**But** : recevoir automatiquement, et avec l'accord de Meta, les publications Facebook des ministères qui n'ont pas de site actif. Il faut un seul clic de l'administrateur de chaque page (« Autoriser Bic Gouv SN »). Ensuite, chaque publication arrive toute seule, avec son texte exact et ses photos.

**Pourquoi cette démarche** : Meta interdit toute collecte automatique sans autorisation écrite, même sur des pages publiques. Voir la notice de https://www.facebook.com/robots.txt et les conditions https://www.facebook.com/legal/automated_data_collection_terms. La seule voie autorisée passe par l'interface officielle de Meta :
- autorisations `pages_show_list` et `pages_read_engagement` ;
- « accès avancé », qui exige l'**examen de l'application** et la **vérification de l'organisation**.

**Durée** : de quelques jours à quelques semaines, selon Meta. **Coût** : gratuit.

## 1. Ce que le BIC doit fournir

Rien ne doit être inventé : chaque information vient du BIC, telle qu'elle figure sur ses documents officiels.

- [ ] **Nom légal exact** du Bureau d'Information et de Communication du Gouvernement, tel qu'il figure sur ses documents officiels.
- [ ] **Adresse officielle** et **numéro de téléphone** de l'institution.
- [ ] **Site web officiel** de l'institution, et une **adresse e-mail sur ce même domaine**. Meta vérifie que le domaine appartient bien à l'organisation, par un code à placer dans le site ou dans la configuration du domaine.
- [ ] **Un document officiel**, en couleur, entier et en cours de validité, portant le nom légal et l'adresse ou le téléphone. Exemples : texte portant création ou organisation du BIC, ou attestation officielle signée et revêtue du cachet. Meta refuse les documents sans signature ni cachet officiels.
- [ ] **Une personne responsable** au BIC, avec un compte Facebook personnel réel protégé par la double authentification, qui sera administratrice du portefeuille de l'organisation chez Meta.
- [ ] **Une politique de confidentialité publiée en ligne** (adresse publique). Sa base factuelle existe déjà (`docs/confidentialite/inventaire-des-donnees.md`). Le texte juridique doit être rédigé par un juriste et doit mentionner les publications Facebook collectées.

## 2. Les étapes

1. **Portefeuille d'organisation** : la personne responsable ouvre https://business.facebook.com et crée le portefeuille au nom légal du BIC.
2. **Vérification de l'organisation** : dans les paramètres du portefeuille, rubrique « Centre de sécurité », lancez la vérification avec le nom, l'adresse, le téléphone, le site et le document officiel.
3. **Vérification du domaine** : dans « Sécurité de la marque », puis « Domaines », ajoutez le domaine du site officiel et placez le code fourni par Meta (l'équipe du site s'en charge).
4. **Application** : sur https://developers.facebook.com, la personne responsable crée une application de type « Entreprise », nommée **Bic Gouv SN** et rattachée au portefeuille du BIC. Claude la configure ensuite pas à pas avec elle.
5. **Examen par Meta** : Claude prépare la demande (textes en anglais ci-dessous) et la vidéo de démonstration, filmée dans la console d'administration : un administrateur de page clique sur « Connecter une page Facebook », autorise, puis voit les publications arriver.
6. **Ministères** : une fois l'accès accordé, le BIC envoie à la cellule de communication de chaque ministère un lien personnel. Un administrateur de la page clique une seule fois. Il peut retirer l'autorisation à tout moment.

## 3. Textes prêts pour l'examen de Meta (en anglais, langue de l'examen)

**App description**

> Bic Gouv SN is the citizen app of the Government of Senegal's Information and Communication Bureau (BIC). It brings together, in French and Wolof, the official news published by the Presidency, the Prime Minister's Office and the ministries. Each item links back to its official source. Some ministries publish only on their Facebook Page: with the Page administrator's consent, the app reads the Page's own posts to show them, unchanged and attributed, to citizens.

**`pages_show_list`**

> Used once, when a ministry's Page administrator connects their Page in our administration console, to let them pick which Page they administer and authorise. We store only the selected Page's id and name.

**`pages_read_engagement`**

> Used to read the posts published by the connected Page itself (text, photos, link, publication time) so that our app can show these official announcements to citizens, unchanged, with a link to the original post. We do not read comments, reactions or any personal data of Page visitors, and we never post, reply or message on behalf of the Page.

**Data handling** : seuls les contenus publiés par la page elle-même sont gardés : texte, photos, date et lien. Aucune donnée personnelle des visiteurs n'est lue. Une page déconnectée n'est plus lue ; ses publications déjà affichées restent consultables avec leur source, comme pour un site officiel.

## 4. Pages Facebook officielles repérées (09/10/2026, à confirmer avec chaque ministère)

| Ministère | Page | Remarque |
|---|---|---|
| Intégration africaine et Affaires étrangères | https://www.facebook.com/DiplomatieSN/ | environ 44 000 abonnés |
| Jeunesse et Sports | https://www.facebook.com/MinJeunesseSportsCultureSN | ancien intitulé (avec la Culture) |
| Mines et Géologie | https://www.facebook.com/MMGSENEGAL/ | ancienne page du ministère, activité à vérifier |
| Économie, Plan et Coopération | https://www.facebook.com/economie.sn/ | |
| Urbanisme, Collectivités territoriales et Aménagement | https://www.facebook.com/p/Minist%C3%A8re-de-lurbanisme-des-collectivit%C3%A9s-territoriales-et-am%C3%A9nagement-100064007764751/ | le ministère a déjà alerté sur de fausses pages : vérifier avec lui |
| Famille, Action sociale et Solidarités | https://www.facebook.com/MinFamilleSN | à vérifier (même nom que son compte X) |
| Finances et Budget | page « minfinances » annoncée sur son site | adresse exacte à confirmer |
| Communication et Relations avec les Institutions | https://www.facebook.com/MCTNSN/ ? | page d'un ancien ministère regroupant Communication et Numérique : à confirmer |
| Transports terrestres et aériens, Microfinance, Environnement, Secrétariat général du Gouvernement | — | aucune page trouvée (comptes X, LinkedIn ou Instagram seulement) |

Plusieurs ministères qui ont un site actif ont aussi une page (Intérieur, Santé, Industrie et Commerce). Le site reste la source tant qu'il publie.
