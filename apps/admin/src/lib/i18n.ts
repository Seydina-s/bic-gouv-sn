import { adminFr, createTranslator } from "@bgs/i18n";

/** The console is French only. */
export const t = createTranslator({ lang: "fr", reference: adminFr, catalog: adminFr });
