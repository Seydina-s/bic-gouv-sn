import { Stack, useLocalSearchParams } from "expo-router";
import { ClockIcon as Clock } from "phosphor-react-native/src/icons/Clock";
import { GlobeIcon as Globe } from "phosphor-react-native/src/icons/Globe";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
import { PhoneIcon as Phone } from "phosphor-react-native/src/icons/Phone";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { directionsUrl } from "../../features/near-me/directions";
import { ServiceBadge } from "../../features/near-me/ServiceParts";
import { useStateServices } from "../../features/near-me/useStateServices";
import { formatPublishedOn } from "../../features/news/format";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

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

/**
 * One state service: what it is, where, when it opens, how to reach it, and the
 * way there through the phone's own navigation app. Only verified facts.
 */
export default function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const services = useStateServices();
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  const service = services.data?.services.find((item) => item.id === id);

  const screen = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: "",
        headerBackTitle: t("article.back"),
        headerTintColor: color.textBrand,
        headerStyle: { backgroundColor: color.background },
        headerShadowVisible: false,
      }}
    />
  );

  if (service === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: color.background, padding: space.xl }]}>
        {screen}
        {services.isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("nearMe.notFound")}
          </Text>
        )}
      </View>
    );
  }

  const open = (url: string) => () => void Linking.openURL(url);
  const verifiedOn = formatPublishedOn(service.verifiedAt.slice(0, 10), lang);

  return (
    <View style={[styles.flex, { backgroundColor: color.background }]}>
      {screen}
      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.lg,
          alignSelf: "center",
          width: "100%",
          maxWidth: layout.readingMaxWidth,
        }}
      >
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
          <Text style={[textStyle.label, { color: color.onPrimary }]}>
            {t("nearMe.directions")}
          </Text>
        </Pressable>

        <View>
          {(service.address ?? service.town) !== null && (
            <Fact
              icon={MapPin}
              label={t("nearMe.address")}
              value={[service.address, service.town].filter(Boolean).join(", ")}
            />
          )}
          {service.openingHours !== null && (
            <Fact icon={Clock} label={t("nearMe.hours")} value={service.openingHours} />
          )}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  fact: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
