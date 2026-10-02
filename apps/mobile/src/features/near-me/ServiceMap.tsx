import { type GeoPoint, type PublicService, SENEGAL_BOUNDS } from "@bgs/shared-types";
import {
  Camera,
  type CameraRef,
  type FilterSpecification,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
  Layer,
  Map as MapLibreMap,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { themes } from "@bgs/ui";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { MARKER_IMAGES } from "./marker-images";
import { AROUND_ZOOM, initialView, mapStyleUrl, servicePoints, touchedPoint } from "./service-map";
import { API_BASE_URL } from "../../api/base-url";

/** The map never leaves Senegal, the area of our tiles and of the services. */
const COUNTRY: [number, number, number, number] = [...SENEGAL_BOUNDS];
/** Labels are drawn with the letters our API serves next to the tiles. */
const LABEL_FONT = ["Noto Sans Medium"];
/**
 * The service points, in screen points (the map draws them itself). Services closer
 * than `groupRadius` gather into one numbered circle, larger past 10 and 50.
 */
const MARKER = {
  groupRadius: 44,
  groupSizes: [16, 10, 20, 50, 26],
  ring: 2,
  /** The kind's marker (32 points), and larger when chosen. */
  iconSize: 1,
  chosenIconSize: 1.35,
  haloRadius: 28,
  haloOpacity: 0.24,
  /** Names sit under their point, in lines of at most this many letters widths. */
  labelOffset: 1.2,
  labelWidth: 9,
  labelHalo: 1.5,
} as const;
const GROUPED: FilterSpecification = ["has", "point_count"];
const SINGLE: FilterSpecification = ["!", ["has", "point_count"]];

export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ServiceMapProps {
  services: readonly PublicService[];
  /** Around what the map looks: the person's position or a chosen town. */
  origin: GeoPoint | null;
  /** The person's own point, drawn only once they shared their position. */
  showsPosition: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  /** The base map could not load (no network, nothing kept): the list takes over. */
  onFail: () => void;
  /** Room taken by the controls over the map: points are never framed beneath them. */
  padding: MapPadding;
}

/**
 * Native map of the verified state services (MapLibre) on the base map served by
 * our API. Loaded only when the native module exists (see map-support.ts); the
 * list shows the same services everywhere else, and to screen readers.
 */
export default function ServiceMap({
  services,
  origin,
  showsPosition,
  selectedId,
  onSelect,
  onClear,
  onFail,
  padding,
}: ServiceMapProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { textStyle } = theme;
  // The base map is always light: what is drawn on it takes the light colors too
  // (a dark theme's light text would vanish on it).
  const color = themes.light.color;
  const camera = useRef<CameraRef>(null);
  const source = useRef<GeoJSONSourceRef>(null);
  const points = useMemo(() => servicePoints(services), [services]);
  // The first view is set once; after that the camera moves only to a new place.
  const [firstView] = useState(() => initialView(origin, services));
  const place = origin === null ? null : `${String(origin.lat)},${String(origin.lng)}`;
  const shownPlace = useRef(place);

  useEffect(() => {
    if (place === shownPlace.current) {
      return;
    }
    shownPlace.current = place;
    if (origin !== null) {
      camera.current?.flyTo({ center: [origin.lng, origin.lat], zoom: AROUND_ZOOM, padding });
    }
  }, [origin, place, padding]);

  const onPoints = (features: readonly GeoJSON.Feature[]) => {
    const touch = touchedPoint(features);
    if (touch?.kind === "group") {
      // A numbered circle opens on the services it gathers.
      void source.current?.getClusterExpansionZoom(touch.groupId).then(
        (zoom) => {
          camera.current?.easeTo({ center: touch.center, zoom, padding });
        },
        () => undefined,
      );
      return;
    }
    if (touch?.kind === "service") {
      const service = services.find((item) => item.id === touch.id);
      if (service !== undefined) {
        camera.current?.easeTo({
          center: [service.location.lng, service.location.lat],
          padding,
        });
      }
      onSelect(touch.id);
    }
  };

  const chosen: FilterSpecification = ["==", ["get", "id"], selectedId ?? ""];

  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      // Always the light map: easier to read (decision of 30/09/2026); the controls
      // around it follow the theme.
      mapStyle={mapStyleUrl(API_BASE_URL, "light")}
      attribution={false}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      onPress={onClear}
      onDidFailLoadingMap={onFail}
      accessibilityLabel={t("nearMe.mapLabel")}
      accessibilityHint={t("nearMe.mapHint")}
      testID="service-map"
    >
      <Camera
        ref={camera}
        minZoom={5}
        maxZoom={17}
        maxBounds={COUNTRY}
        initialViewState={
          firstView === null ? { bounds: COUNTRY, padding } : { ...firstView, padding }
        }
      />
      <Images images={MARKER_IMAGES} />
      <GeoJSONSource
        ref={source}
        id="services"
        data={points}
        cluster
        clusterRadius={MARKER.groupRadius}
        clusterMaxZoom={AROUND_ZOOM}
        onPress={(event) => {
          // The map itself would take the touch too, and close the preview.
          event.stopPropagation();
          onPoints(event.nativeEvent.features);
        }}
      >
        <Layer
          id="service-groups"
          type="circle"
          filter={GROUPED}
          paint={{
            "circle-color": color.primary,
            "circle-radius": ["step", ["get", "point_count"], ...MARKER.groupSizes],
            "circle-stroke-width": MARKER.ring,
            "circle-stroke-color": color.onPrimary,
          }}
        />
        <Layer
          id="service-group-counts"
          type="symbol"
          filter={GROUPED}
          layout={{
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": LABEL_FONT,
            "text-size": textStyle.label.fontSize,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          }}
          paint={{ "text-color": color.onPrimary }}
        />
        {/* The chosen service sits on a soft halo, under its larger marker. */}
        <Layer
          id="service-chosen-halo"
          type="circle"
          filter={chosen}
          paint={{
            "circle-color": color.primary,
            "circle-radius": MARKER.haloRadius,
            "circle-opacity": MARKER.haloOpacity,
          }}
        />
        {/* Each service: its kind's marker (tone and icon), as in the list. */}
        <Layer
          id="service-points"
          type="symbol"
          filter={SINGLE}
          layout={{
            "icon-image": ["get", "category"],
            "icon-size": ["case", chosen, MARKER.chosenIconSize, MARKER.iconSize],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "symbol-sort-key": ["case", chosen, 1, 0],
          }}
        />
        <Layer
          id="service-names"
          type="symbol"
          minzoom={AROUND_ZOOM - 1}
          filter={SINGLE}
          layout={{
            "text-field": ["get", "name"],
            "text-font": LABEL_FONT,
            "text-size": textStyle.caption.fontSize,
            "text-anchor": "top",
            "text-offset": [0, MARKER.labelOffset],
            "text-max-width": MARKER.labelWidth,
            "text-optional": true,
          }}
          paint={{
            "text-color": color.textPrimary,
            "text-halo-color": color.background,
            "text-halo-width": MARKER.labelHalo,
          }}
        />
      </GeoJSONSource>
      {showsPosition && <NativeUserLocation />}
    </MapLibreMap>
  );
}
