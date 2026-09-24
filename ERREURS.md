# ERREURS.md — Bic Gouv SN

Journal des erreurs corrigées dans ce projet (CLAUDE.md §16). Une erreur n'est close que lorsque son correctif **et** sa règle de prévention sont documentés.

| Date | Ce qui s'est passé | Cause racine | Correctif | Fichier(s) | Règle de prévention | Généralisable ? |
|---|---|---|---|---|---|---|
| 24/09/2026 | Un chemin Windows écrit dans STATUS.md via `sed`/`awk` a été corrompu (`\t`, `\n`, `\U` interprétés comme séquences d'échappement). | Insertion de chemins contenant des antislashs par des outils qui interprètent les échappements. | Ligne réécrite avec l'outil d'écriture de fichier (sans interprétation). | `.claude/session/STATUS.md` | Tout texte contenant des chemins Windows est écrit avec Write/Edit ou un heredoc quoté (`<<'EOF'`), jamais via `sed`/`awk`/`echo -e`. Relire la ligne après écriture. | Oui |
