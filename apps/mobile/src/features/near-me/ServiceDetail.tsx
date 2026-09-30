import type { PublicService } from "@bgs/shared-types";
import { ClockIcon as Clock } from "phosphor-react-native/src/icons/Clock";
import { GlobeIcon as Globe } from "phosphor-react-native/src/icons/Globe";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
import { PhoneIcon as Phone } from "phosphor-react-native/src/icons/Phone";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatPublishedOn } from "../news/format";
import { directionsUrl } from "./directions";
import { describeHours, type HoursWords } from "./opening-hours";
import { ServiceBadge } from "./ServiceParts";

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

/** One fact of the service: an icon, a label, the source's own words. */
function Fact({
  icon,
  label,
  value,
  onPress,
}: {
  icon: ComponentType<PhosphorProps>;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, touchTarget } = theme;
  const content = (
    <>
      <Icon icon={icon} weight="duotone" color={color.textBrand} />
      <View style={styles.flex}>
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{label}</Text>
        <Text
          style={[
            textStyle.body,
            { color: onPress === undefined ? color.textPrimary : color.textBrand },
          ]}
        >
          {value}
        </Text>
      </View>
    </>
  );
  const style = [
    styles.fact,
    {
      gap: space.md,
      paddingVertical: space.md,
      minHeight: touchTarget.min,
      borderTopColor: color.border,
    },
  ];
  return onPress === undefined ? (
    <View accessible style={style}>
      {content}
    </View>
  ) : (
    <Pressable accessibilityRole="link" onPress={onPress} style={style}>
      {content}
    </Pressable>
  );
}

function useHoursWords(): HoursWords {
  const { t } = useTranslation();
  return {
    always: t("nearMe.hoursAlways"),
    everyDay: t("nearMe.hoursEveryDay"),
    dayRange: (from, to) => t("nearMe.hoursDayRange", { from, to }),
    oneDay: (day) => t("nearMe.hoursOneDay", { day }),
    rule: (days, times) => t("nearMe.hoursRule", { days, times }),
    time: (start, end) => t("nearMe.hoursTime", { start, end }),
    and: t("nearMe.hoursAnd"),
    day: (key) => t(`nearMe.day.${key}`),
  };
}

/**
 * One state service: what it is, where, when it opens, how to reach it, and the
 * way there through the phone's own navigation app. Only verified facts. Its own
 * screen, the detail pane beside the list on a large screen, or the map's panel.
 */
export function ServiceDetail({
  service,
  bottomInset,
}: {
  service: PublicService;
  bottomInset: number;
}) {
  const { theme } = useTheme();
  const { space, layout } = theme;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: space.lg,
        paddingBottom: bottomInset + space.xxl,
        alignSelf: "center",
        width: "100%",
        maxWidth: layout.readingMaxWidth,
      }}
    >
      <ServiceCard service={service} />
    </ScrollView>
  );
}

/** The facts of a service, without their own scrolling (a page or a panel scrolls them). */
export function ServiceCard({ service }: { service: PublicService }) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const hoursWords = useHoursWords();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const open = (url: string) => () => void Linking.openURL(url);
  // In plain French when fully understood; as the source wrote it otherwise.
  const hours =
    service.openingHours === null
      ? null
      : (describeHours(service.openingHours, hoursWords) ?? service.openingHours);
  const verifiedOn = formatPublishedOn(service.verifiedAt.slice(0, 10), lang);

  return (
    <View style={{ gap: space.lg }}>
      <Text accessibilityRole="header" style={[textStyle.title, { color: color.textPrimary }]}>
        {service.name}
      </Text>
      <View style={[styles.row, { gap: space.md }]}>
        <ServiceBadge category={service.category} />
        <Text style={[textStyle.label, { color: color.textSecondary }]}>
          {t(`nearMe.category.${service.category}`)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={open(directionsUrl(service.location, service.name, Platform.OS))}
        style={({ pressed }) => [
          styles.button,
          {
            gap: space.sm,
            minHeight: touchTarget.min,
            borderRadius: radius.md,
            paddingHorizontal: space.xl,
            backgroundColor: pressed ? color.primaryPressed : color.primary,
          },
        ]}
      >
        <Icon icon={NavigationArrow} size="sm" weight="fill" color={color.onPrimary} />
        <Text style={[textStyle.label, { color: color.onPrimary }]}>{t("nearMe.directions")}</Text>
      </Pressable>

      <View>
        {(service.address ?? service.town) !== null && (
          <Fact
            icon={MapPin}
            label={t("nearMe.address")}
            value={[service.address, service.town].filter(Boolean).join(", ")}
          />
        )}
        {hours !== null && <Fact icon={Clock} label={t("nearMe.hours")} value={hours} />}
        {service.phone !== null && (
          <Fact
            icon={Phone}
            label={t("nearMe.call", { phone: service.phone })}
            value={service.phone}
            onPress={open(`tel:${service.phone.replace(/[^\d+]/g, "")}`)}
          />
        )}
        {service.website !== null && (
          <Fact
            icon={Globe}
            label={t("nearMe.website")}
            value={service.website}
            onPress={open(service.website)}
          />
        )}
      </View>

      <View style={{ gap: space.xs }}>
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {t("nearMe.verifiedOn", { date: verifiedOn })}
        </Text>
        {service.origin === "osm" && (
          <Pressable accessibilityRole="link" onPress={open(OSM_COPYRIGHT)}>
            <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
              {t("nearMe.attribution")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  fact: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
