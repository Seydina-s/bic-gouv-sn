/**
 * One tone per kind of state service (user decision, 30/09/2026): each map marker
 * has its kind's color and icon, and the list's badges match them, so the list
 * reads as the map's legend. Earthy hues around the flag green; red stays reserved
 * for alerts. Always paired with the kind's icon and name: color is never the only
 * cue. Contrast is checked in service-tones.test.ts.
 */
export interface ServiceTone {
  /** The marker on the map (always the light map), under a white icon. */
  marker: string;
  /** Tinted background of the list badge. */
  container: string;
  /** The icon on that background. */
  ink: string;
}

/** The base map is always light: markers do not change with the theme. */
const MARKERS = {
  mairie: "#00853F",
  prefecture: "#3D4FA8",
  police: "#0B5E8C",
  gendarmerie: "#4F6420",
  tribunal: "#7A3B78",
  ministere: "#A03E12",
  administration: "#4B5866",
} as const;

export type ServiceKind = keyof typeof MARKERS;

export type ServiceTones = Readonly<Record<ServiceKind, ServiceTone>>;

export const lightServiceTones: ServiceTones = {
  mairie: { marker: MARKERS.mairie, container: "#E0F0E8", ink: "#007136" },
  prefecture: { marker: MARKERS.prefecture, container: "#E8EAF5", ink: "#34438F" },
  police: { marker: MARKERS.police, container: "#E2ECF1", ink: "#095077" },
  gendarmerie: { marker: MARKERS.gendarmerie, container: "#EAECE4", ink: "#43551B" },
  tribunal: { marker: MARKERS.tribunal, container: "#EFE7EF", ink: "#683266" },
  ministere: { marker: MARKERS.ministere, container: "#F4E8E3", ink: "#88350F" },
  administration: { marker: MARKERS.administration, container: "#E9EBED", ink: "#404B57" },
};

export const darkServiceTones: ServiceTones = {
  mairie: { marker: MARKERS.mairie, container: "#002512", ink: "#B3DAC5" },
  prefecture: { marker: MARKERS.prefecture, container: "#11162F", ink: "#C5CAE5" },
  police: { marker: MARKERS.police, container: "#031A27", ink: "#B6CFDD" },
  gendarmerie: { marker: MARKERS.gendarmerie, container: "#161C09", ink: "#CAD1BC" },
  tribunal: { marker: MARKERS.tribunal, container: "#221122", ink: "#D7C4D7" },
  ministere: { marker: MARKERS.ministere, container: "#2D1105", ink: "#E3C5B8" },
  administration: { marker: MARKERS.administration, container: "#15191D", ink: "#C9CDD1" },
};

/**
 * The land of our light base map ("earth" in /v1/map/style.json?theme=light, read on
 * 30/09/2026). Markers also carry a white ring that sets them apart from any ground.
 */
export const MAP_LAND = "#E2DFDA";
