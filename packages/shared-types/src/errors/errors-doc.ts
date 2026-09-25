import { ERROR_CATALOG, type ErrorSeverity } from "./error-catalog";

const SEVERITY_LABEL: Record<ErrorSeverity, string> = {
  critical: "🔴 Rouge",
  warning: "🟡 Jaune",
  info: "🟢 Vert",
};

function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

/** Markdown for docs/errors-catalog.md, generated from the catalog (single source). */
export function renderErrorsDoc(): string {
  const rows = Object.entries(ERROR_CATALOG).map(
    ([code, entry]) =>
      `| \`${code}\` | ${SEVERITY_LABEL[entry.severity]} | ${cell(entry.what)} | ${cell(entry.where)} | ${cell(entry.impact)} | ${cell(entry.action)} |`,
  );
  return [
    "# Catalogue des erreurs",
    "",
    "<!-- Généré depuis packages/shared-types/src/errors/error-catalog.ts : ne pas modifier à la main. -->",
    "<!-- Mise à jour : pnpm errors:doc -->",
    "",
    "Chaque erreur technique de la plateforme a ici son explication en français simple, affichée telle quelle dans le journal des erreurs de l'administration. Un code absent de ce catalogue est signalé « non répertorié » pour être ajouté.",
    "",
    "Gravité : 🔴 utilisateurs bloqués · 🟡 fonctionnement dégradé ou à surveiller · 🟢 information.",
    "",
    "| Code | Gravité | Quoi | Où | Impact | Que faire |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}
