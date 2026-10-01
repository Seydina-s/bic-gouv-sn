import type { Place } from "@bgs/shared-types";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { PlaceSearch } from "./ServiceParts";
import type { LocationStatus } from "../location/LocationProvider";

export interface LocationPanelProps {
  /** Where the list is measured from: the phone, a chosen town, or nowhere yet. */
  around: { kind: "position" } | { kind: "town"; place: Place } | null;
  status: LocationStatus;
  places: readonly Place[];
  onUsePosition: () => void;
  onChooseTown: (place: Place) => void;
  onChange: () => void;
}

/**
 * Where "near me" is measured from. The location is asked only when the person
 * taps the button; choosing a town works without it (CLAUDE.md §1).
 */
export function LocationPanel({
  around,
  status,
  places,
  onUsePosition,
  onChooseTown,
  onChange,
}: LocationPanelProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [searching, setSearching] = useState(false);
  const [typed, setTyped] = useState("");
  const { color, space, textStyle, radius, touchTarget, opacity } = theme;

  if (around !== null) {
    const place = around.kind === "town" ? around.place.name : t("nearMe.myPosition");
    return (
      <View style={[styles.row, { gap: space.sm, paddingHorizontal: space.lg }]}>
        <Icon icon={MapPin} size="sm" weight="fill" color={color.textBrand} />
        <Text style={[textStyle.label, styles.flex, { color: color.textPrimary }]}>
          {t("nearMe.around", { place })}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSearching(false);
            setTyped("");
            onChange();
          }}
          style={({ pressed }) => [
            styles.center,
            {
              minHeight: touchTarget.min,
              paddingHorizontal: space.sm,
              opacity: pressed ? opacity.cardPressed : 1,
            },
          ]}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>{t("nearMe.change")}</Text>
        </Pressable>
      </View>
    );
  }

  const button = [
    styles.button,
    {
      minHeight: touchTarget.min,
      borderRadius: radius.md,
      gap: space.sm,
      paddingHorizontal: space.lg,
    },
  ];
  const locating = status === "locating";
  const notice =
    status === "denied"
      ? t("nearMe.denied")
      : status === "unavailable"
        ? t("nearMe.unavailable")
        : null;

  return (
    <View
      style={{
        marginHorizontal: space.lg,
        padding: space.lg,
        gap: space.md,
        borderRadius: radius.lg,
        backgroundColor: color.surface,
      }}
    >
      {notice !== null && (
        <Text
          accessibilityLiveRegion="polite"
          style={[textStyle.body, { color: color.textPrimary }]}
        >
          {notice}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: locating }}
        disabled={locating}
        onPress={onUsePosition}
        style={({ pressed }) => [
          button,
          { backgroundColor: pressed ? color.primaryPressed : color.primary },
        ]}
      >
        {locating ? (
          <ActivityIndicator color={color.onPrimary} />
        ) : (
          <Icon icon={NavigationArrow} size="sm" weight="fill" color={color.onPrimary} />
        )}
        <Text style={[textStyle.label, { color: color.onPrimary }]}>
          {locating ? t("nearMe.locating") : t("nearMe.useLocation")}
        </Text>
      </Pressable>
      {searching ? (
        <PlaceSearch places={places} typed={typed} onType={setTyped} onChoose={onChooseTown} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSearching(true);
          }}
          style={({ pressed }) => [
            button,
            {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: color.borderStrong,
              backgroundColor: pressed ? color.surfaceRaised : color.background,
            },
          ]}
        >
          <Icon icon={MapPin} size="sm" color={color.textBrand} />
          <Text style={[textStyle.label, { color: color.textBrand }]}>
            {t("nearMe.chooseTown")}
          </Text>
        </Pressable>
      )}
      <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
        {t("nearMe.privacy")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
