# STATUS — Bic Gouv SN

**Dernière mise à jour** : 27/09/2026 (nuit) · **Mode** : autonome prolongé jusqu'à 11 h (demande de l'utilisateur) ; résumé complet à lui remettre à son retour

## Où on en est
- Dépôt **public et sécurisé** : https://github.com/Seydina-s/bic-gouv-sn. `main` protégée : tout passe par PR + 3 contrôles verts.
- Articles : 953 (FR + WO), une « La Une » défilante, rangées par rubrique, pages de rubrique à 20 articles numérotées ; barre du haut et bouton « Revenir en haut » sur tous les écrans qui défilent ; réglages sur verre.
- Démarches : 718 fiches, 18 thèmes (15 officiels + 3 ajoutés), toutes classées (716 par délégation, 2 par l'utilisateur). Onglet « Démarches » = cartes de thèmes ; page de thème à 20 démarches numérotées (DEM-06).
- **DEM-07 (27/09)** : fiche de démarche repensée (« En bref », sections illustrées, pièces à cocher, étapes numérotées, remarques en encadrés, bouton fixe vers e-senegal.sn). Reconnaissance vérifiée sur les 718 fiches réelles (aucun texte perdu). Défaut serveur découvert et corrigé : 7 démarches au nom long ne s'ouvraient pas (API-06).
- Console d'administration : connexion interne (mot de passe + second code), l'utilisateur est administrateur ; écran de validation des thèmes.
- Garde-fou de langue : crochets Claude Code (français obligatoire pour tout texte destiné à l'utilisateur).

## En attente de l'utilisateur (mis de côté pendant le mode autonome)
1. W-01 locuteurs wolof ; A-01 logo ; A-02 identifiant de l'app ; L-02 questions au BIC (dont la licence du code) ; S1-02 budget d'hébergement.

## Prochaine tâche
NEWS-05 (page de catégorie d'articles plus belle, pagination plus visible), puis le backlog : TEST-05, DEM-04 (lier démarches et carte), PERF-03 (poids de Sentry), SEARCH-01, MED-02b, DATA-01. SPLASH-01 attend le logo ; UX-01 attend les retours design ; UPG-01 attend la version stable d'Expo SDK 58.

## Constat environnement
- Node système 20.20.0 (inchangé). Projet : Node 24 — ajouter `C:\Users\HP\tools\fnm\data\node-versions\v24.21.0\installation` en tête du PATH.
- Git : e-mail local du dépôt = adresse anonyme GitHub (ne jamais revenir à l'e-mail personnel). Sauvegarde de l'ancien historique : `C:\Users\HP\tools\backup-bic-gouv-sn.git`.
- GitHub CLI : `C:\Users\HP\tools\gh\bin\gh.exe` (absent du PATH des shells de Claude : appeler par chemin complet).
- API locale : dans `apps/api`, `pnpm build` puis `PORT=3100 pnpm start` (chemins de données résolus depuis la racine, clé admin lue dans `.env.local`). Arrêter l'ancien processus `node` avant de relancer : arrêter la tâche de fond ne suffit pas toujours (le port reste pris).
- Vérification visuelle : export web (`EXPO_PUBLIC_API_URL= npx expo export -p web`, API via le relais du serveur local port 8084) + Chrome headless (émulation mobile, `scratchpad/cdp-shot.mjs`).
- Vérification des fiches de démarche : `scratchpad/audit-sheets.mts` (tsx, pause de 150 ms entre deux requêtes).
- Pas de Python sur la machine : scripts en Node. Tout texte contenant un accent grave, `$` ou un antislash s'écrit avec l'éditeur, jamais via le shell.
