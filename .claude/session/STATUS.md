# STATUS — Bic Gouv SN

**Dernière mise à jour** : 27/09/2026 (15 h 30) · **Mode** : autonome prolongé jusqu'à 17 h (demande de l'utilisateur, qui vérifie les services dans la console en parallèle) ; résumé complet à 17 h, avec le guide d'installation sur iPhone

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts.
- Articles : 953 (FR + WO). Démarches : 718 fiches, 18 thèmes. Polices **Noto Sans + Noto Serif** (choix de l'utilisateur, PR #69).
- **Carte des services (Phase 3)** : 880 services proposés (OpenStreetMap), console de vérification et de correction, onglet « Près de moi » (liste, calcul sur le téléphone). **Aucun service vérifié à 13 h 30** : l'onglet affiche un message d'attente honnête.
- **Fond de carte (MAP-06, option A)** : tuiles du Sénégal, style clair/sombre sans points d'intérêt, lettres et icônes servis par notre API (PR #70) ; requêtes de carte non journalisées (PR #71) ; carte native dans l'app avec pilule « Carte / Liste », aperçu, « Me localiser » sur demande, repli sur la liste (PR #72). Expo Go et le web gardent la liste.
- Version de test : profil `development` dans `apps/mobile/eas.json`, guide `docs/guides/installer-la-version-de-test-iphone.md`. **Aucune compilation lancée** : attend le compte Apple Developer (A-03, 99 USD/an, à valider).
- Console : mentions de licence dans « À propos » de l'app (PR #73) ; **déplacer un service** mal placé (coordonnées ou lien de carte, refus hors du Sénégal, PR #74) et **ajouter un service** absent de la source (PR #75). Actifs seulement après le redémarrage de l'API (AUD3-01) ; d'ici là, la console le dit au lieu de faire croire à l'enregistrement.
- Audit croisé de fin de sprint : AUD3-01 à AUD3-07 dans le backlog.

## En attente de l'utilisateur
1. Vérifier les services de Dakar dans la console : c'est ce qui les fait apparaître dans l'app (liste et carte).
2. A-03 : accepter ou non le coût du compte Apple Developer (sans lui : test de la carte sur Android, gratuit).
3. Redémarrage de l'API locale (port 3100) pour qu'elle serve la carte : **il déconnecte la console** (sessions en mémoire) ; à faire seulement avec son accord.
4. Restés en attente ce soir (réponse du 27/09) : A-01 logo, A-02 identifiant officiel, W-01 wolof, L-02 questions au BIC, S1-02 hébergement.

## Prochaine tâche
Avec l'accord de l'utilisateur : redémarrer l'API locale (AUD3-01). Puis LIC-01 (liste générée des bibliothèques libres), MAP-11 (carte hors ligne), et QA-02 / AUD3-02 / AUD3-03 dès la version de test installée.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel).
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (appeler par chemin complet). gitleaks : `C:\Users\HP\tools\gitleaks\gitleaks.exe`. pmtiles : `C:\Users\HP\tools\pmtiles\pmtiles.exe`.
- API locale : dans `apps/api`, `pnpm build` puis `PORT=3100 pnpm start`. Arrêter l'ancien processus `node … dist/server.mjs` avant de relancer (arrêter la tâche de fond ne suffit pas). **Le redémarrage déconnecte la console.**
- Fond de carte : `.data/tiles/senegal.pmtiles` (217 Mo) et `.data/map/` (`pnpm map:assets`) ; procédure `docs/runbooks/fond-de-carte.md`.
- Après un changement de branche dont le fichier de verrouillage diffère : `pnpm install --frozen-lockfile` avant toute commande (ERREURS.md, 27/09).
- Expo : le module de version de développement est installé ; pour Expo Go, lancer le serveur avec `npx expo start --go`.
- Vérification visuelle : export web + Chrome headless (`scratchpad/cdp-shot.mjs`, variables WAIT, EVAL, AFTER, POST). Données de test : toujours une copie jetable, jamais `.data/`.
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur ; une espace insécable s'écrit en séquence d'échappement (vérifier les octets).
