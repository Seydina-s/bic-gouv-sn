import type { ServiceCategory } from "@bgs/shared-types";
import administration from "../../../assets/map-markers/administration.png";
import gendarmerie from "../../../assets/map-markers/gendarmerie.png";
import mairie from "../../../assets/map-markers/mairie.png";
import ministere from "../../../assets/map-markers/ministere.png";
import police from "../../../assets/map-markers/police.png";
import prefecture from "../../../assets/map-markers/prefecture.png";
import tribunal from "../../../assets/map-markers/tribunal.png";

/**
 * One marker per kind of service, its tone and its icon (pnpm map:markers draws
 * them from the service tones of @bgs/ui and the list's Phosphor icons).
 */
export const MARKER_IMAGES: Readonly<Record<ServiceCategory, number>> = {
  mairie,
  prefecture,
  police,
  gendarmerie,
  tribunal,
  ministere,
  administration,
};
