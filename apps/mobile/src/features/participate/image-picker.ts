/*
 * The photo picker library, imported like any package: lazy loads require this
 * file, never the package itself, so that one build of it only ever runs
 * (ERREURS.md, 02/10/2026; rule in eslint.config.mjs).
 */
export * from "expo-image-picker";
