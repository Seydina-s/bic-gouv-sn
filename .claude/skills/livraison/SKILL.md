---
name: livraison
description: Livre un changement de Bic Gouv SN jusqu'à la fusion et au déploiement — copie de travail et branche, commit, script ship.sh (contrôles de la CI, scan des secrets, PR, file de fusion, mise à jour à distance de l'app), puis déploiement local, vérifications et mise à jour du suivi. À utiliser pour livrer, pousser, ouvrir ou fusionner une PR, publier une mise à jour de l'app ou déployer.
---

# Livraison d'un changement

Les scripts sont dans `C:\Users\HP\bgs-ops` (mode d'emploi : `README.md` du dossier). Tout texte visible par l'utilisateur est en français ; commits, PR et commentaires techniques en anglais.

## 1. Avant

- **Jamais dans la copie servie** `C:\bic-gouv-sn` (détachée sur main, d'où tournent les services). Travailler dans `-w2` ou `-w4`, sur une nouvelle branche partie d'`origin/main` : `feat/…`, `fix/…`, `chore/…`.
- Une copie qu'utilise une commande en arrière-plan (livraison, construction, tests) n'est jamais touchée : ni `checkout`, ni `merge`. Prendre l'autre copie.
- Après un changement de branche dont `pnpm-lock.yaml` diffère : `pnpm install --frozen-lockfile`.
- La skill `verification` est passée (verdict RÉUSSI).
- **Suivi** : une ligne horodatée au `backlog.md` (et `decisions.md` pour une décision). Si une autre livraison en cours ajoute aussi une ligne en fin de `backlog.md`, attendre sa fusion, puis `git merge origin/main`, avant d'écrire la sienne (sinon conflit).
- **Commits** : conventionnels, en anglais, avec la seule identité Git de l'utilisateur. Jamais de ligne `Co-Authored-By: Claude`, jamais de mention « Generated with Claude Code », ni dans les commits, ni dans les PR.

## 2. Livrer

1. Écrire la description de PR (anglais, rubriques `## Why`, `## What`, `## Checks`) dans le dossier temporaire de la session.
2. Lancer, **en arrière-plan**, sortie redirigée vers un fichier (jamais dans un tube) :
   ```
   bash /c/Users/HP/bgs-ops/ship.sh <copie> <branche> "<titre>" <fichier-description> ["<message de mise à jour en français>"]
   ```
   Le message de mise à jour à distance ne se donne que si l'app mobile change ; il est lu par l'utilisateur, en français.
3. Attendre la notification de fin, puis lire les dernières lignes du journal : « all checks green », « PR #<n> », « <n> MERGED », « fin ». Le numéro de PR se lit dans ce journal, jamais par déduction.
4. **En cas d'échec** : lire la ligne qui dit quelle étape a échoué, puis son journal (`bgs-ops/logs/`). Corriger, recommiter, relancer. Si la CI échoue deux fois de la même façon, lire le journal du job ou rejouer le contrôle en local au lieu de relancer. Une PR bloquée par l'audit de sécurité : corriger la dépendance sur main, puis `gh pr update-branch <n>`.

## 3. Après la fusion

- Si l'API, la console, `shared-types` ou l'ingestion ont changé : `bash /c/Users/HP/bgs-ops/deploy.sh > <fichier> 2>&1` (autorisé sans demander ; jamais dans un tube), puis vérifier :
  - `curl` sur `http://localhost:3100/v1/health` : 200 ;
  - la console `http://localhost:3001/` : 307, après une vingtaine de secondes de démarrage ;
  - la dernière ligne des journaux des voix (`bgs-ops/logs/voices-<langue>.log`), puisque le déploiement arrête puis relance la boucle des voix.
- Sinon (outils, documents) : mettre la copie servie à jour avec `git -C /c/bic-gouv-sn checkout --detach origin/main` ; elle doit être propre.
- Mettre à jour `.claude/session/STATUS.md` (partie reprise, 80 lignes au plus) et `.claude/session/A-FAIRE-UTILISATEUR.md` si un point avance.
- Remettre la copie de travail en mode détaché sur `origin/main` avant d'y ouvrir la tâche suivante.
