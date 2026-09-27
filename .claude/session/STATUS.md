# STATUS — Bic Gouv SN

**Dernière mise à jour** : 27/09/2026 (matin) · **Mode** : autonome prolongé jusqu'à 11 h (demande de l'utilisateur) ; résumé complet remis à son retour

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts (sur Ubuntu 26.04 depuis le 27/09).
- Articles : 953 (FR + WO), « La Une » défilante, rangées par rubrique ; page de rubrique repensée (bandeau aux couleurs, premier article en grand, « Articles suivants », pages numérotées).
- Démarches : 718 fiches, 18 thèmes, toutes classées. Fiche repensée (« En bref », sections illustrées, pièces à cocher, étapes, « Écouter », bouton fixe vers e-senegal.sn, lien vers le service le plus proche). Les 7 fiches au nom long s'ouvrent de nouveau.
- **Carte des services (Phase 3, démarrée le 27/09)** : 880 services importés d'OpenStreetMap en propositions (331 dans la région de Dakar), 251 villes ; console « Services de l'État » pour vérifier, écarter ou corriger ; onglet « Près de moi » (plus proches d'abord, calcul sur le téléphone, position jamais envoyée). **Aucun service n'est encore vérifié : l'onglet affiche un message d'attente honnête.**
- Console d'administration : connexion interne (mot de passe + second code), thèmes des démarches, services de l'État.
- Garde-fou de langue : crochets Claude Code.

## En attente de l'utilisateur
1. Vérifier les services de Dakar dans la console (« Services de l'État ») : c'est ce qui les fera apparaître dans l'app.
2. Choisir la police (S1-04) : comparaison prête, https://claude.ai/artifact/E2Dm3JFBYMDF6SHeLoD8HH
3. Choisir comment afficher le fond de carte (MAP-06) : build de développement (module natif, plus d'Expo Go) ou carte web intégrée.
4. Toujours ouverts : W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; **L-03 licence ODbL des données OpenStreetMap** ; S1-02 budget d'hébergement.

## Prochaine tâche
Selon les réponses : MAP-06 (fond de carte) ou MAP-03b (déplacer / ajouter un service), MAP-07 (aide à la vérification), puis QA-02/QA-04 (essais sur appareils), SEC-03 (CSP à nonce de la console, avant tout déploiement).

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel). Sauvegarde de l'ancien historique : `C:\Users\HP\tools\backup-bic-gouv-sn.git`.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : dans `apps/api`, `pnpm build` puis `PORT=3100 pnpm start`. Arrêter l'ancien processus `node … dist/server.mjs` avant de relancer : arrêter la tâche de fond ne suffit pas (le port reste pris).
- Import des services : `pnpm --filter @bgs/ingestion services:osm` (rejouable, une requête Overpass).
- Vérification visuelle : export web (`EXPO_PUBLIC_API_URL= npx expo export -p web`, relais du serveur local port 8084) + Chrome headless (`scratchpad/cdp-shot.mjs`). Pour la console : session temporaire (`scratchpad/verif-session.ts`, à copier en `.mts` dans `apps/api`, rôle par `VERIF_ROLE`), toujours supprimée après usage.
- Vérification des fiches de démarche : `scratchpad/audit-sheets.mts`.
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur ; une espace insécable s'écrit en séquence d'échappement, jamais en caractère (vérifier les octets).
