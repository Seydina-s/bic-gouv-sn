/*
 * The map library's offline downloads, imported like everywhere else in the app.
 * MapLibre ships an ES module and a CommonJS build: requiring the package itself
 * loaded the second one beside the first, registered its native views twice and
 * crashed the app at launch (ERREURS.md, 02/10/2026). Lazy loads require this file.
 */
export { OfflineManager } from "@maplibre/maplibre-react-native";
