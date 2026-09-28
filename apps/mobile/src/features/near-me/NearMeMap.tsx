import {
  distanceMeters,
  type GeoPoint,
  type PublicService,
  type ServiceCategory,
} from "@bgs/shared-types";
import { lazy, Suspense, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { useTabBarInset } from "../../components/GlassTabBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import {
  LocateButton,
  MapAttribution,
  MapNotice,
  OfflineAreaButton,
  ServicePreview,
  ViewToggle,
} from "./MapOverlays";
import { loadServiceMap } from "./load-service-map";
import { ServiceFilters } from "./ServiceParts";
import type { LocationStatus } from "./useLocation";
import { useOfflineArea } from "./useOfflineArea";

const ServiceMap = lazy(loadServiceMap);

export interface NearMeMapProps {
  /** The verified services of the chosen kind (all of them, not only the nearest). */
  services: readonly PublicService[];
  origin: GeoPoint | null;
  locationStatus: LocationStatus;
  category: ServiceCategory | null;
  onCategory: (category: ServiceCategory | null) => void;
  onLocate: () => void;
  onOpen: (id: string) => void;
  onShowList: () => void;
}

/**
 * "Près de moi" as a map: the kinds of service on top, the services as points, a
 * preview of the one touched, the person's position on request, and the list one
 * tap away. Every control lies on the common glass.
 */
export function NearMeMap({
  services,
  origin,
  locationStatus,
  category,
  onCategory,
  onLocate,
  onOpen,
  onShowList,
}: NearMeMapProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarInset();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const offline = useOfflineArea(origin);
  const [topBar, setTopBar] = useState(insets.top + theme.touchTarget.min);
  const { color, space, textStyle, touchTarget } = theme;

  // From the bottom: tab bar, the credit line, then the controls.
  const creditBottom = tabBar + space.xs;
  const controlsBottom = creditBottom + textStyle.caption.lineHeight + space.xs * 2 + space.sm;
  const padding = useMemo(
    () => ({
      top: topBar + space.md,
      right: space.lg,
      // Room for the preview of a service, the tallest thing at the bottom.
      bottom: controlsBottom + touchTarget.min * 3,
      left: space.lg,
    }),
    [topBar, controlsBottom, space.md, space.lg, touchTarget.min],
  );

  const selected = services.find((service) => service.id === selectedId) ?? null;
  const notice = failed
    ? { message: t("nearMe.mapFailed"), action: t("nearMe.viewList") }
    : locationStatus === "denied"
      ? { message: t("nearMe.denied"), action: t("nearMe.chooseTown") }
      : locationStatus === "unavailable"
        ? { message: t("nearMe.unavailable"), action: t("nearMe.chooseTown") }
        : null;

  return (
    <View style={[styles.root, { backgroundColor: color.surface }]}>
      <Suspense fallback={null}>
        <ServiceMap
          services={services}
          origin={origin}
          showsPosition={locationStatus === "found"}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onClear={() => {
            setSelectedId(null);
          }}
          onFail={() => {
            setFailed(true);
          }}
          padding={padding}
        />
      </Suspense>
      <View
        onLayout={(event) => {
          setTopBar(event.nativeEvent.layout.height);
        }}
        style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: color.glassBorder }]}
      >
        <GlassBackdrop />
        <ServiceFilters selected={category} onSelect={onCategory} />
      </View>
      {notice !== null ? (
        <MapNotice
          message={notice.message}
          action={notice.action}
          onAction={onShowList}
          top={topBar + space.sm}
        />
      ) : (
        origin !== null && (
          <OfflineAreaButton
            state={offline.state}
            onKeep={() => void offline.keep()}
            top={topBar + space.sm}
          />
        )
      )}
      <MapAttribution bottom={creditBottom} />
      {selected === null ? (
        <>
          <ViewToggle showing="map" onToggle={onShowList} bottom={controlsBottom} />
          <LocateButton
            locating={locationStatus === "locating"}
            onPress={onLocate}
            bottom={controlsBottom}
          />
        </>
      ) : (
        <ServicePreview
          service={selected}
          meters={origin === null ? null : distanceMeters(origin, selected.location)}
          onOpen={onOpen}
          onClose={() => {
            setSelectedId(null);
          }}
          bottom={controlsBottom}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
