import { FlashList, type FlashListRef } from "@shopify/flash-list";
import {
  serviceCategorySchema,
  type Place,
  type PublicService,
  type ServiceCategory,
} from "@bgs/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { useTwoPane } from "../../components/useTwoPane";
import { ServiceDetail } from "../../features/near-me/ServiceDetail";
import { LocationPanel } from "../../features/near-me/LocationPanel";
import { nativeMapAvailable } from "../../features/near-me/map-support";
import { NearMeMap } from "../../features/near-me/NearMeMap";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useFeature } from "../../features/remote-config/useRemoteConfig";
import { nearestServices } from "../../features/near-me/nearby";
import { ServiceFilters, ServiceRow } from "../../features/near-me/ServiceParts";
import { useLocation } from "../../features/near-me/useLocation";
import { useStateServices } from "../../features/near-me/useStateServices";
import { FloatingAppBar } from "../../features/shell/FloatingAppBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

type Around = { kind: "position" } | { kind: "town"; place: Place } | null;

/** The kind asked by the address (a procedure's "find the nearest…"), if it is one. */
function askedKind(raw: string | undefined): ServiceCategory | null {
  const parsed = serviceCategorySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** A service in the list, with its distance once a place to measure from is known. */
interface Row {
  service: PublicService;
  meters: number | null;
}

/**
 * "Près de moi": the verified state services around the person, nearest first,
 * measured on the phone (the location is never sent). Without a location, a town
 * can be chosen; before any choice, the services are listed by name. Where the
 * native map exists (the app's own builds), the same services show on a map.
 */
function NearMe() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const list = useRef<FlashListRef<Row>>(null);
  const scrollTop = useScrollTop();
  const services = useStateServices();
  const location = useLocation();
  const [chosen, setChosen] = useState<Around>(null);
  const asked = useLocalSearchParams<{ category?: string }>().category;
  const [category, setCategory] = useState<ServiceCategory | null>(() => askedKind(asked));
  // Arriving again from a procedure (the tab stays mounted): its kind is shown.
  const [seen, setSeen] = useState(asked);
  if (asked !== seen) {
    setSeen(asked);
    setCategory(askedKind(asked));
  }
  const [mapExists] = useState(nativeMapAvailable);
  const mapSwitchedOn = useFeature("map");
  // The map leads (decision of 30/09/2026); the list alone if it cannot be drawn.
  const [mapFailed, setMapFailed] = useState(false);
  const { color, space, textStyle, touchTarget } = theme;

  // The phone's position counts once found; a town chosen by hand replaces it.
  const around: Around =
    chosen ??
    (location.status === "found" && location.point !== null ? { kind: "position" } : null);
  const origin =
    around?.kind === "town"
      ? around.place.location
      : around?.kind === "position"
        ? location.point
        : null;
  const all = useMemo(() => services.data?.services ?? [], [services.data]);
  const kept = useMemo(
    () => (category === null ? all : all.filter((service) => service.category === category)),
    [all, category],
  );
  const rows = useMemo<Row[]>(
    () =>
      origin === null
        ? kept.map((service) => ({ service, meters: null }))
        : nearestServices(kept, origin, null),
    [kept, origin],
  );
  // The map is offered only with something to show on it.
  const canMap = mapExists && mapSwitchedOn && all.length > 0 && !mapFailed;
  const { twoPane, listPaneWidth } = useTwoPane();
  const [selected, setSelected] = useState<string | null>(null);
  // On a large screen, the nearest service (or the one chosen) beside the list.
  const shown = twoPane
    ? (rows.find((row) => row.service.id === selected) ?? rows[0])?.service
    : undefined;
  const openService = (id: string) => {
    if (twoPane) {
      setSelected(id);
    } else {
      router.push({ pathname: "/service/[id]", params: { id } });
    }
  };
  const locateMe = () => {
    setChosen(null);
    void location.locate();
  };

  // Where to measure from, and the kinds of service: on top of the list or the panel.
  const choices = (
    <>
      <LocationPanel
        around={around}
        status={location.status}
        places={services.data?.places ?? []}
        onUsePosition={locateMe}
        onChooseTown={(place) => {
          setChosen({ kind: "town", place });
        }}
        onChange={() => {
          setChosen(null);
          location.forget();
        }}
      />
      <ServiceFilters selected={category} onSelect={setCategory} />
    </>
  );

  const header = (
    <View style={{ paddingTop: insets.top + space.xl, gap: space.md }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text accessibilityRole="header" style={[textStyle.headline, { color: color.textPrimary }]}>
          {t("nearMe.title")}
        </Text>
        <Text style={[textStyle.body, { color: color.textSecondary, marginTop: space.xs }]}>
          {t("nearMe.intro")}
        </Text>
      </View>
      {mapFailed && (
        <Text
          style={[textStyle.bodySmall, { color: color.textSecondary, paddingHorizontal: space.lg }]}
        >
          {t("nearMe.mapFailed")}
        </Text>
      )}
      {/* Nothing verified yet: no reason to ask for the location (asked only when useful). */}
      {all.length > 0 && choices}
    </View>
  );

  const empty = services.isPending ? (
    <ActivityIndicator color={color.primary} style={{ marginTop: space.xl }} />
  ) : services.isError && all.length === 0 ? (
    <View style={{ padding: space.lg, gap: space.md }}>
      <Text style={[textStyle.body, { color: color.textSecondary }]}>{t("nearMe.error")}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void services.refetch()}
        style={[
          styles.retry,
          {
            minHeight: touchTarget.min,
            paddingHorizontal: space.xl,
            backgroundColor: color.primary,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[textStyle.label, { color: color.onPrimary }]}>{t("feed.retry")}</Text>
      </Pressable>
    </View>
  ) : (
    <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
      {all.length === 0 ? t("nearMe.comingSoon") : t("nearMe.none")}
    </Text>
  );

  const footer =
    all.length === 0 ? null : (
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(OSM_COPYRIGHT)}
        style={{ padding: space.lg, minHeight: touchTarget.min }}
      >
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {t("nearMe.attribution")}
        </Text>
      </Pressable>
    );

  if (canMap) {
    return (
      <NearMeMap
        services={kept}
        rows={rows}
        origin={origin}
        locationStatus={location.status}
        header={choices}
        empty={empty}
        onLocate={locateMe}
        onMapFailed={() => {
          setMapFailed(true);
        }}
      />
    );
  }

  return (
    <View style={[styles.split, { backgroundColor: color.background }]}>
      {/* The same tree in both layouts: typing a town never loses the keyboard. */}
      <View
        style={
          twoPane
            ? [styles.listPane, { width: listPaneWidth, borderRightColor: color.border }]
            : styles.root
        }
      >
        <FlashList
          ref={list}
          onScroll={scrollTop.onScroll}
          scrollEventThrottle={100}
          data={rows}
          keyExtractor={(row) => row.service.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          extraData={shown?.id}
          renderItem={({ item }) => (
            <ServiceRow
              service={item.service}
              meters={item.meters}
              selected={item.service.id === shown?.id}
              onPress={openService}
            />
          )}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingBottom: bottomInset + space.xl }}
          testID="near-me-list"
        />
        <ScrollTopButton
          visible={scrollTop.visible}
          bottom={bottomInset + space.sm}
          onPress={() => {
            list.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
      </View>
      {shown !== undefined && (
        <View style={styles.root}>
          <ServiceDetail service={shown} bottomInset={bottomInset} />
        </View>
      )}
      {!twoPane && <FloatingAppBar visible={scrollTop.visible} top={insets.top} />}
    </View>
  );
}

/** "Près de moi", unless the console switched it off for the moment. */
export default function NearMeScreen() {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="nearMe" title={t("nearMe.title")}>
      <NearMe />
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  split: { flex: 1, flexDirection: "row" },
  listPane: { borderRightWidth: StyleSheet.hairlineWidth },
  retry: { alignSelf: "flex-start", alignItems: "center", justifyContent: "center" },
});
