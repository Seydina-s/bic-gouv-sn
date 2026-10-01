import type { GeoPoint, PublicService } from "@bgs/shared-types";
import { windowClass } from "@bgs/ui";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { useTwoPane } from "../../components/useTwoPane";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { LocateButton, MapAttribution, MapNotice, OfflineAreaButton } from "./MapOverlays";
import { loadServiceMap } from "./load-service-map";
import {
  NearMeSheet,
  NearMeSidePanel,
  SHEET_SNAPS,
  type NearbyRow,
  type NearMeSheetHandle,
} from "./NearMeSheet";
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
  // Large screens, and phones on their side (a sliding panel would leave a strip):
  // the panel is fixed on the left, the map takes the rest.
  const { twoPane: wide, listPaneWidth } = useTwoPane();
  const window = useWindowDimensions();
  const sideways = window.width > window.height && windowClass(window.width) !== "compact";
  const twoPane = wide || sideways;
  const side = twoPane ? listPaneWidth : 0;

  // With a side panel, the controls sit above the tab bar instead of on a sheet.
  useEffect(() => {
    if (twoPane && height > 0) {
      position.value = height - tabBar;
    }
  }, [twoPane, height, tabBar, position]);

  const top = insets.top + space.sm;
  // The map keeps its points clear of the panel at its resting height.
  const padding = useMemo(
    () => ({
      top: top + touchTarget.min,
      right: space.lg,
      bottom: tabBar + (twoPane ? 0 : height * (SHARES[rest] ?? 0)) + space.lg,
      left: side + space.lg,
    }),
    [top, touchTarget.min, space.lg, tabBar, height, rest, twoPane, side],
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
          // Beside the map, the town search is already in view: nothing to open.
          action={
            twoPane
              ? undefined
              : {
                  label: t("nearMe.chooseTown"),
                  onPress: () => {
                    sheet.current?.resize(EXPANDED);
                  },
                }
          }
          top={top}
          left={side}
        />
      ) : (
        origin !== null && (
          <OfflineAreaButton state={offline.state} onKeep={() => void offline.keep()} top={top} />
        )
      )}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.abovePanel, { height, left: side }, abovePanel]}
      >
        <MapAttribution bottom={space.sm} />
        <LocateButton
          locating={locationStatus === "locating"}
          onPress={onLocate}
          bottom={space.sm}
        />
      </Animated.View>
      {twoPane ? (
        <NearMeSidePanel
          width={side}
          bottomInset={tabBar}
          header={header}
          rows={rows}
          empty={empty}
          selected={selected}
          onSelect={setSelectedId}
          onBack={() => {
            setSelectedId(null);
          }}
        />
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  abovePanel: { position: "absolute", left: 0, right: 0, top: 0 },
});
