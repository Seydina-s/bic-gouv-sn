---
name: verification
description: Vérifie un changement de Bic Gouv SN avant de le dire terminé — lance les contrôles exacts de la CI (installation stricte, lint, types, format, tests avec couverture), relit le diff, vérifie qu'aucun test n'a été affaibli, puis rend RÉUSSI ou ÉCHOUÉ avec les preuves. À utiliser après toute modification de code, avant de dire qu'une tâche est finie, avant un commit ou une livraison, ou quand on demande de vérifier, tester, contrôler ou valider.
allowed-tools: Bash(bash ${CLAUDE_SKILL_DIR}/scripts/verify.sh *) Bash(git diff *) Bash(git status *)
---

# Vérification d'un changement

« Terminé » veut dire : les contrôles ont été lancés, leur résultat a été observé et il est écrit. Jamais sur la foi d'un résumé, ni d'un test qui passe parce qu'il a été assoupli.

## 1. Les contrôles exacts de la CI

Depuis la racine de la copie de travail (jamais la copie servie `C:\bic-gouv-sn`), **exécuter** le script, sans le lire :

```
bash ${CLAUDE_SKILL_DIR}/scripts/verify.sh
```

Il enchaîne, en s'arrêtant au premier échec : installation stricte, lint, types, format, tests avec couverture (seuils de la CI), puis vérifie qu'aucun contrôle n'a réécrit `pnpm-lock.yaml`. Il donne le chemin du journal des tests. Code de sortie 0 = vert. Les tests prennent plusieurs minutes : le lancer en arrière-plan, sortie redirigée vers un fichier (jamais dans un tube).

Pendant le travail, lancer d'abord les tests du seul paquet touché (plus rapide) ; un filtre (`-t`, un seul fichier) ne sert que pendant l'écriture. Après **la dernière** modification, le verdict repose sur le script complet : un texte retiré ou un type changé casse souvent un test d'un autre fichier (25/10 : un parcours des réglages attendait encore une note retirée).

## 2. Contrôles en plus, selon le changement

- **Écran de l'app ou de la console** : construire puis auditer (`pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build && pnpm --filter @bgs/mobile export:web && pnpm a11y`).
- **Animation d'une fenêtre ou d'un panneau** : `pnpm e2e` en plus, après les mêmes constructions.
- **Assistant** (recherche, consigne du modèle, sources) : `bash /c/Users/HP/bgs-ops/check-bench.sh <copie>` (≈ 0,17 $, remet seul les résultats du jour) ; pièges toujours à 15 / 15, aucune réponse inventée.
- **Comportement critique** : test de mutation. Faire d'abord un commit d'étape local, casser le code, voir le test échouer, restaurer par une copie de sauvegarde (jamais `git checkout --` sur un fichier non commité).
- **Outil de contrôle mis à jour** (lint, audit, tests, build) : lancer ce contrôle-là en local, c'est lui qui casse.

## 3. Lire le diff

`git diff origin/main...HEAD` puis `git diff` (non commité). Trois contrôles systématiques :

1. **Changements non demandés** : un fichier hors du sujet, une valeur de configuration modifiée en passant.
2. **Tests affaiblis** : `.skip`, `.only`, `it.todo`, assertions supprimées ou rendues plus lâches, seuils de couverture baissés, délais allongés pour faire passer, fichiers de test supprimés. « Si un test échoue, on corrige le code, pas le test. »
3. **Ajouts à risque** : nouvelle dépendance, URL ou clé écrite en dur, couleur hors tokens, texte hors i18n, caractère de contrôle invisible (`grep -c $'\x08'` sur les documents modifiés par script).

## 4. Rapport (format fixe)

- **Verdict** : RÉUSSI ou ÉCHOUÉ.
- **Preuves** : chaque commande lancée, son résultat (nombre de tests, code de sortie), le chemin des journaux.
- **Diff** : fichiers touchés ; rien d'inattendu, ou ce qui l'est et pourquoi.
- **Tests** : aucun affaibli, ou lesquels et pourquoi.
- **Non vérifié** : ce qui n'a pas pu l'être, dit franchement.
