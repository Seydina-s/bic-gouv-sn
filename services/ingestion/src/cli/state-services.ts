// State services of Senegal from OpenStreetMap, as proposals to check in the console:
// `pnpm --filter @bgs/ingestion services:osm`. Nothing is shown in the app before a
// person verifies it; a verified service is never changed silently by a new import.
// OpenStreetMap data: © OpenStreetMap contributors, ODbL. Messages are in French.
import { fileURLToPath } from "node:url";
import { FileStateServiceStore } from "@bgs/content-store";
import { toImportedService, toPlace } from "../sources/osm/classify";
import { fetchStateServices } from "../sources/osm/overpass";

const dataDir = new URL("../../../../.data/", import.meta.url);
const store = new FileStateServiceStore(
  process.env["STATE_SERVICES_PATH"] ?? fileURLToPath(new URL("state-services.json", dataDir)),
);

const fetchedAt = new Date().toISOString();
const elements = await fetchStateServices();
const services = elements.flatMap((element) => toImportedService(element, fetchedAt) ?? []);
const places = elements.flatMap((element) => toPlace(element) ?? []);
const outcome = await store.importServices(services, places);

const counts = new Map<string, number>();
for (const service of services) {
  counts.set(service.category, (counts.get(service.category) ?? 0) + 1);
}
for (const [category, count] of [...counts].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`${String(count).padStart(5)}  ${category}\n`);
}
process.stdout.write(
  [
    `${String(services.length)} services lus, ${String(places.length)} villes.`,
    `${String(outcome.added)} nouveaux (à vérifier dans la console), ${String(outcome.updated)} propositions mises à jour, ${String(outcome.unchanged)} inchangés.`,
    `${String(outcome.changedAfterReview)} services déjà vérifiés ont changé à la source : le changement attend une vérification.`,
    "",
  ].join("\n"),
);
