import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { PublicService } from "@bgs/shared-types";
import { ArrowLeftIcon as ArrowLeft } from "phosphor-react-native/src/icons/ArrowLeft";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { InPanel } from "./FieldTextInput";
import { ServiceCard } from "./ServiceDetail";
import { ServiceRow } from "./ServiceParts";

/** Reduced at first (the map leads), then halfway, then most of the screen. */
export const SHEET_SNAPS = ["25%", "45%", "70%"] as const;
const SIZES = ["reduced", "medium", "expanded"] as const;
const OPENED_ON_SERVICE = 1;

export interface NearbyRow {
  service: PublicService;
  meters: number | null;
}

/** What the screen may ask of the panel. */
export interface NearMeSheetHandle {
  /** 0 reduced, 1 halfway, 2 most of the screen. */
  resize: (index: number) => void;
}

export interface NearMeSheetProps {
  ref?: Ref<NearMeSheetHandle>;
  /** The place measured from and the kinds of service, on top of the list. */
  header: ReactNode;
  rows: readonly NearbyRow[];
  empty: ReactNode;
  /** The service shown in the panel instead of the list, if one is chosen. */
  selected: PublicService | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  /** Height of the tab bar under the panel. */
  bottomInset: number;
  /** Written by the panel as it moves: its top edge, for the controls above it. */
  position: SharedValue<number>;
  /** The resting height index, for the map to keep its points clear of the panel. */
  onRest: (index: number) => void;
}

/**
 * The drag handle, also adjustable with a screen reader: swiping up or down on it
 * resizes the panel, so no one needs the drag gesture.
 */
function Handle({ index, onSize }: { index: number; onSize: (next: number) => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, touchTarget } = theme;
  const size = SIZES[index] ?? "reduced";
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t("nearMe.panel")}
      accessibilityValue={{ text: t(`nearMe.panelSize.${size}`) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
        onSize(Math.min(SIZES.length - 1, Math.max(0, index + step)));
      }}
      style={[styles.handle, { minHeight: touchTarget.min / 2 + space.md }]}
    >
      <View
        style={{
          width: space.xxl,
          height: space.xs,
          borderRadius: radius.full,
          backgroundColor: color.borderStrong,
        }}
      />
    </View>
  );
}

/**
 * "Près de moi" over the map: a sliding panel with the services, nearest first,
 * or the one chosen. The map stays visible and usable above it (as in the best
 * map apps: Google Maps, Yango, Apple Plans).
 */
export function NearMeSheet({
  ref,
  header,
  rows,
  empty,
  selected,
  onSelect,
  onBack,
  bottomInset,
  position,
  onRest,
}: NearMeSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, touchTarget } = theme;
  const sheet = useRef<BottomSheet>(null);
  const [rest, setRest] = useState(0);
  const resize = useCallback((next: number) => {
    sheet.current?.snapToIndex(next);
  }, []);
  useImperativeHandle(ref, () => ({ resize }), [resize]);

  // A service chosen (on the map or in the list) opens the panel halfway on it.
  useEffect(() => {
    if (selected !== null) {
      sheet.current?.snapToIndex(Math.max(rest, OPENED_ON_SERVICE));
    }
    // Only when the chosen service changes, not at every resting height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handle = useCallback(() => <Handle index={rest} onSize={resize} />, [rest, resize]);

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={[...SHEET_SNAPS]}
      bottomInset={bottomInset}
      animatedPosition={position}
      enableDynamicSizing={false}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      onChange={(next) => {
        setRest(next);
        onRest(next);
      }}
      handleComponent={handle}
      backgroundStyle={{ backgroundColor: color.background }}
      style={[styles.sheet, { shadowColor: color.scrim }]}
    >
      <InPanel value={true}>
        {selected === null ? (
          <BottomSheetFlatList
            data={rows}
            keyExtractor={(row: NearbyRow) => row.service.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={<View style={{ gap: space.md }}>{header}</View>}
            ListEmptyComponent={<>{empty}</>}
            renderItem={({ item }: { item: NearbyRow }) => (
              <ServiceRow
                service={item.service}
                meters={item.meters}
                selected={false}
                onPress={onSelect}
              />
            )}
            contentContainerStyle={{ paddingBottom: space.xl }}
            testID="near-me-sheet-list"
          />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingHorizontal: space.lg,
              paddingBottom: space.xxl,
              gap: space.md,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={[styles.back, { gap: space.sm, minHeight: touchTarget.min }]}
            >
              <Icon icon={ArrowLeft} size="sm" color={color.textBrand} />
              <Text style={[textStyle.label, { color: color.textBrand }]}>
                {t("nearMe.backToList")}
              </Text>
            </Pressable>
            <ServiceCard service={selected} />
          </BottomSheetScrollView>
        )}
      </InPanel>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    elevation: 12,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { alignItems: "center", justifyContent: "center" },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
});
