import type { GeoPoint, PublicService } from "@bgs/shared-types";
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { LocateButton, MapAttribution, MapNotice, OfflineAreaButton } from "./MapOverlays";
import { loadServiceMap } from "./load-service-map";
import { NearMeSheet, SHEET_SNAPS, type NearbyRow, type NearMeSheetHandle } from "./NearMeSheet";
import type { LocationStatus } from "./useLocation";
import { useOfflineArea } from "./useOfflineArea";

const ServiceMap = lazy(loadServiceMap);

/** The share of the screen each resting height of the panel covers. */
const SHARES = SHEET_SNAPS.map((snap) => Number.parseFloat(snap) / 100);
const EXPANDED = SHEET_SNAPS.length - 1;

export interface NearMeMapProps {
  /** The verified services of the chosen kind (all of them, not only the nearest). */
  services: readonly PublicService[];
  rows: readonly NearbyRow[];
  origin: GeoPoint | null;
  locationStatus: LocationStatus;
  /** The place measured from and the kinds of service, on top of the panel's list. */
  header: ReactNode;
  empty: ReactNode;
  onLocate: () => void;
  /** The map could not be drawn: the screen falls back to the list alone. */
  onMapFailed: () => void;
}

/**
 * "Près de moi", map first (decision of 30/09/2026, as in Yango or Google Maps):
 * the services as points on a light map, and a sliding panel with the list, the
 * place, the kinds of service and the chosen service. The locate button rides on
 * the panel's edge.
 */
export function NearMeMap({
  services,
  rows,
  origin,
  locationStatus,
  header,
  empty,
  onLocate,
  onMapFailed,
}: NearMeMapProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarInset();
  const sheet = useRef<NearMeSheetHandle>(null);
  const position = useSharedValue(0);
  const [height, setHeight] = useState(0);
  const [rest, setRest] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const offline = useOfflineArea(origin);
  const { space, touchTarget } = theme;

  const top = insets.top + space.sm;
  // The map keeps its points clear of the panel at its resting height.
  const padding = useMemo(
    () => ({
      top: top + touchTarget.min,
      right: space.lg,
      bottom: tabBar + height * (SHARES[rest] ?? 0) + space.lg,
      left: space.lg,
    }),
    [top, touchTarget.min, space.lg, tabBar, height, rest],
  );
  // A layer as tall as the screen whose bottom follows the panel's top edge.
  const abovePanel = useAnimatedStyle(() => ({
    transform: [{ translateY: position.value - height }],
  }));

  const selected = services.find((service) => service.id === selectedId) ?? null;
  const notice =
    locationStatus === "denied"
      ? t("nearMe.denied")
      : locationStatus === "unavailable"
        ? t("nearMe.unavailable")
        : null;

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
      }}
    >
      <Suspense fallback={null}>
        <ServiceMap
          services={services}
          origin={origin}
          showsPosition={locationStatus === "found"}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClear={() => {
            setSelectedId(null);
          }}
          onFail={onMapFailed}
          padding={padding}
        />
      </Suspense>
      {notice !== null ? (
        <MapNotice
          message={notice}
          action={t("nearMe.chooseTown")}
          onAction={() => {
            sheet.current?.resize(EXPANDED);
          }}
          top={top}
        />
      ) : (
        origin !== null && (
          <OfflineAreaButton state={offline.state} onKeep={() => void offline.keep()} top={top} />
        )
      )}
      <Animated.View pointerEvents="box-none" style={[styles.abovePanel, { height }, abovePanel]}>
        <MapAttribution bottom={space.sm} />
        <LocateButton
          locating={locationStatus === "locating"}
          onPress={onLocate}
          bottom={space.sm}
        />
      </Animated.View>
      <NearMeSheet
        ref={sheet}
        header={header}
        rows={rows}
        empty={empty}
        selected={selected}
        onSelect={setSelectedId}
        onBack={() => {
          setSelectedId(null);
        }}
        bottomInset={tabBar}
        position={position}
        onRest={setRest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  abovePanel: { position: "absolute", left: 0, right: 0, top: 0 },
});
