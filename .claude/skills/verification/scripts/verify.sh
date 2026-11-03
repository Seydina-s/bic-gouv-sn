#!/usr/bin/env bash
# The exact CI checks of the monorepo, stopping at the first failure (skill "verification").
# Run from a working copy; prints each step and the path of the test log; exit 0 = all green.
set -u
node24="/c/Users/HP/tools/fnm/data/node-versions/v24.21.0/installation"
[ -d "$node24" ] && export PATH="$node24:$PATH"
root="$(git rev-parse --show-toplevel)" || exit 1
cd "$root" || exit 1
log="$(mktemp -t verify-tests-XXXXXX.log)"

step() { printf '%s… ' "$1"; }

step "installation stricte"
pnpm install --frozen-lockfile > /dev/null 2>&1 || { echo "ÉCHEC : fichier de verrouillage pas à jour (pnpm install --lockfile-only, puis commit)"; exit 1; }
echo "ok"
step "lint"
pnpm lint > /dev/null 2>&1 || { echo "ÉCHEC : relancer pnpm lint pour le détail"; exit 1; }
echo "ok"
step "types"
pnpm typecheck > /dev/null 2>&1 || { echo "ÉCHEC : relancer pnpm typecheck pour le détail"; exit 1; }
echo "ok"
step "format"
npx prettier --check . > /dev/null 2>&1 || { echo "ÉCHEC : npx prettier --check . pour le détail"; exit 1; }
echo "ok"
step "tests et couverture"
pnpm test > "$log" 2>&1 || { echo "ÉCHEC (journal : $log)"; exit 1; }
echo "ok"
[ -z "$(git status --porcelain pnpm-lock.yaml)" ] || { echo "ÉCHEC : un contrôle a réécrit pnpm-lock.yaml"; exit 1; }
echo "Tous les contrôles de la CI sont verts (journal des tests : $log)"
