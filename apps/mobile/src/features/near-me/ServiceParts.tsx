import type { Place, PublicService, ServiceCategory } from "@bgs/shared-types";
import { tracking } from "@bgs/ui";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { BankIcon as Bank } from "phosphor-react-native/src/icons/Bank";
import { BriefcaseIcon as Briefcase } from "phosphor-react-native/src/icons/Briefcase";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { FlagIcon as Flag } from "phosphor-react-native/src/icons/Flag";
import { ScalesIcon as Scales } from "phosphor-react-native/src/icons/Scales";
import { ShieldCheckIcon as ShieldCheck } from "phosphor-react-native/src/icons/ShieldCheck";
import { ShieldStarIcon as ShieldStar } from "phosphor-react-native/src/icons/ShieldStar";
import type { ComponentType } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatDistance, matchingPlaces } from "./nearby";

/** One icon per kind of service, shared by the list, the filters and the service page. */
export const SERVICE_ICONS: Record<ServiceCategory, ComponentType<PhosphorProps>> = {
  mairie: Bank,
  prefecture: Flag,
  police: ShieldCheck,
  gendarmerie: ShieldStar,
  tribunal: Scales,
  ministere: Buildings,
  administration: Briefcase,
};

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  "mairie",
  "police",
  "gendarmerie",
  "tribunal",
  "prefecture",
  "ministere",
  "administration",
];

/** Round badge with the service's icon. */
export function ServiceBadge({ category }: { category: ServiceCategory }) {
  const { theme } = useTheme();
  const { color, radius, touchTarget } = theme;
  return (
    <View
      style={[
        styles.badge,
        {
          width: touchTarget.min,
          height: touchTarget.min,
          borderRadius: radius.full,
          backgroundColor: color.primaryContainer,
        },
      ]}
    >
      <Icon icon={SERVICE_ICONS[category]} weight="duotone" color={color.onPrimaryContainer} />
    </View>
  );
}

/** One service in the list: its kind, its name, how far, where. */
export function ServiceRow({
  service,
  meters,
  onPress,
}: {
  service: PublicService;
  meters: number | null;
  onPress: (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  const kind = t(`nearMe.category.${service.category}`);
  const distance =
    meters === null ? null : t("nearMe.distance", { distance: formatDistance(meters) });
  const where = service.address ?? service.town;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[service.name, kind, distance, where].filter(Boolean).join(". ")}
      onPress={() => {
        onPress(service.id);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.md,
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          borderTopColor: color.border,
          backgroundColor: pressed ? color.surface : color.background,
        },
      ]}
    >
      <ServiceBadge category={service.category} />
      <View style={styles.flex}>
        <Text
          style={[
            textStyle.body,
            { color: color.textPrimary, fontFamily: textStyle.subtitle.fontFamily },
          ]}
        >
          {service.name}
        </Text>
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
          {[kind, distance].filter(Boolean).join(" · ")}
        </Text>
        {where !== null && (
          <Text numberOfLines={1} style={[textStyle.bodySmall, { color: color.textTertiary }]}>
            {where}
          </Text>
        )}
      </View>
      <Icon icon={CaretRight} size="sm" color={color.textTertiary} />
    </Pressable>
  );
}

/** Kind of service to show, as a row of chips; "Tous" shows every kind. */
export function ServiceFilters({
  selected,
  onSelect,
}: {
  selected: ServiceCategory | null;
  onSelect: (category: ServiceCategory | null) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const chip = (category: ServiceCategory | null) => {
    const active = selected === category;
    const ink = active ? color.onPrimaryContainer : color.textSecondary;
    const label = category === null ? t("nearMe.all") : t(`nearMe.filter.${category}`);
    return (
      <Pressable
        key={category ?? "all"}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => {
          onSelect(category);
        }}
        style={({ pressed }) => [
          styles.chip,
          {
            minHeight: touchTarget.min,
            gap: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.full,
            borderColor: active ? color.primaryContainer : color.border,
            backgroundColor: active ? color.primaryContainer : color.background,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        {category !== null && <Icon icon={SERVICE_ICONS[category]} size="sm" color={ink} />}
        <Text style={[textStyle.caption, styles.caps, { color: ink }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t("nearMe.filters")}
      contentContainerStyle={{
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
      }}
    >
      {chip(null)}
      {SERVICE_CATEGORIES.map(chip)}
    </ScrollView>
  );
}

/** Search a town by its name, to find services when the location is not shared. */
export function PlaceSearch({
  places,
  typed,
  onType,
  onChoose,
}: {
  places: readonly Place[];
  typed: string;
  onType: (text: string) => void;
  onChoose: (place: Place) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const matches = matchingPlaces(places, typed);
  return (
    <View style={{ gap: space.sm }}>
      <TextInput
        value={typed}
        onChangeText={onType}
        autoFocus
        autoCorrect={false}
        accessibilityLabel={t("nearMe.townLabel")}
        placeholder={t("nearMe.townPlaceholder")}
        placeholderTextColor={color.textTertiary}
        returnKeyType="search"
        style={[
          textStyle.body,
          styles.input,
          {
            color: color.textPrimary,
            backgroundColor: color.background,
            borderColor: color.borderStrong,
            borderRadius: radius.md,
            minHeight: touchTarget.min,
            paddingHorizontal: space.lg,
          },
        ]}
      />
      {typed.trim() !== "" && matches.length === 0 && (
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
          {t("nearMe.noTown")}
        </Text>
      )}
      {matches.map((place) => (
        <Pressable
          key={place.id}
          accessibilityRole="button"
          onPress={() => {
            onChoose(place);
          }}
          style={({ pressed }) => [
            styles.place,
            {
              minHeight: touchTarget.min,
              paddingHorizontal: space.md,
              borderRadius: radius.md,
              backgroundColor: pressed ? color.surfaceRaised : undefined,
            },
          ]}
        >
          <Text style={[textStyle.body, { color: color.textPrimary }]}>{place.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  chip: { flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
  caps: { textTransform: "uppercase", letterSpacing: tracking.caps },
  input: { borderWidth: StyleSheet.hairlineWidth },
  place: { justifyContent: "center" },
});
