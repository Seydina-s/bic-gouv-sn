import type { PublicService } from "@bgs/shared-types";
import { ArrowRightIcon as ArrowRight } from "phosphor-react-native/src/icons/ArrowRight";
import { ListBulletsIcon as ListBullets } from "phosphor-react-native/src/icons/ListBullets";
import { MapTrifoldIcon as MapTrifold } from "phosphor-react-native/src/icons/MapTrifold";
import { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
import { XIcon as X } from "phosphor-react-native/src/icons/X";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { directionsUrl } from "./directions";
import { formatDistance } from "./nearby";
import { ServiceBadge } from "./ServiceParts";

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

/**
 * The common glass (DESIGN.md) under every control laid over the map: same blur,
 * same veil, same thin outline and soft lift as the tab bar.
 */
function Glass({
  radius,
  style,
  children,
}: {
  radius: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.lift, { borderRadius: radius, shadowColor: theme.color.scrim }, style]}>
      <View style={[styles.clip, { borderRadius: radius, borderColor: theme.color.glassBorder }]}>
        <GlassBackdrop />
        {children}
      </View>
    </View>
  );
}

/** "Carte" / "Liste": the floating pill that switches the way services are shown. */
export function ViewToggle({
  showing,
  onToggle,
  bottom,
}: {
  showing: "list" | "map";
  onToggle: () => void;
  bottom: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const toMap = showing === "list";
  return (
    <View pointerEvents="box-none" style={[styles.centered, { bottom }]}>
      <Glass radius={radius.full}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toMap ? t("nearMe.viewMapLabel") : t("nearMe.viewListLabel")}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.row,
            {
              minHeight: touchTarget.min,
              gap: space.sm,
              paddingHorizontal: space.xl,
              opacity: pressed ? theme.opacity.cardPressed : 1,
            },
          ]}
        >
          <Icon icon={toMap ? MapTrifold : ListBullets} weight="duotone" color={color.textBrand} />
          <Text style={[textStyle.label, { color: color.textPrimary }]}>
            {toMap ? t("nearMe.viewMap") : t("nearMe.viewList")}
          </Text>
        </Pressable>
      </Glass>
    </View>
  );
}

/** Round button that finds the person on the map (the position stays on the phone). */
export function LocateButton({
  locating,
  onPress,
  bottom,
}: {
  locating: boolean;
  onPress: () => void;
  bottom: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, touchTarget } = theme;
  return (
    <Glass radius={radius.full} style={[styles.anchor, { right: space.lg, bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("nearMe.locateMe")}
        accessibilityState={{ busy: locating }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.square,
          {
            width: touchTarget.min,
            height: touchTarget.min,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        {locating ? (
          <ActivityIndicator color={color.textBrand} />
        ) : (
          <Icon icon={NavigationArrow} weight="fill" color={color.textBrand} />
        )}
      </Pressable>
    </Glass>
  );
}

/** A short message over the map, with the way out (usually: the list). */
export function MapNotice({
  message,
  action,
  onAction,
  top,
}: {
  message: string;
  action: string;
  onAction: () => void;
  top: number;
}) {
  const { theme } = useTheme();
  const { color, space, radius, textStyle, touchTarget } = theme;
  return (
    <Glass radius={radius.lg} style={[styles.anchor, { top, left: space.lg, right: space.lg }]}>
      <View accessibilityLiveRegion="polite" style={{ padding: space.md, gap: space.xs }}>
        <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.link, { minHeight: touchTarget.min }]}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>{action}</Text>
        </Pressable>
      </View>
    </Glass>
  );
}

/** The chosen service over the map: what it is, how far, its page and the way there. */
export function ServicePreview({
  service,
  meters,
  onOpen,
  onClose,
  bottom,
}: {
  service: PublicService;
  meters: number | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  bottom: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const kind = t(`nearMe.category.${service.category}`);
  const distance =
    meters === null ? null : t("nearMe.distance", { distance: formatDistance(meters) });
  return (
    <Glass radius={radius.lg} style={[styles.anchor, { bottom, left: space.lg, right: space.lg }]}>
      <View style={{ padding: space.md, gap: space.md }} testID="service-preview">
        <View style={[styles.row, { gap: space.md }]}>
          <ServiceBadge category={service.category} />
          <View style={styles.flex}>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
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
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nearMe.closePreview")}
            onPress={onClose}
            style={[styles.square, { width: touchTarget.min, height: touchTarget.min }]}
          >
            <Icon icon={X} color={color.textSecondary} />
          </Pressable>
        </View>
        <View style={[styles.row, { gap: space.sm }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onOpen(service.id);
            }}
            style={({ pressed }) => [
              styles.action,
              {
                minHeight: touchTarget.min,
                gap: space.sm,
                borderRadius: radius.md,
                backgroundColor: color.primary,
                opacity: pressed ? theme.opacity.cardPressed : 1,
              },
            ]}
          >
            <Text style={[textStyle.label, { color: color.onPrimary }]}>
              {t("nearMe.openService")}
            </Text>
            <Icon icon={ArrowRight} size="sm" color={color.onPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(directionsUrl(service.location, service.name, Platform.OS))
            }
            style={({ pressed }) => [
              styles.action,
              {
                minHeight: touchTarget.min,
                borderRadius: radius.md,
                borderColor: color.borderStrong,
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: color.background,
                opacity: pressed ? theme.opacity.cardPressed : 1,
              },
            ]}
          >
            <Text style={[textStyle.label, { color: color.textBrand }]}>
              {t("nearMe.directions")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Glass>
  );
}

/** OpenStreetMap's credit (ODbL), always visible on the map, with its link. */
export function MapAttribution({ bottom }: { bottom: number }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  // A small label, but a full-size target: the touch area reaches 48 dp.
  const reach = (touchTarget.min - textStyle.caption.lineHeight) / 2;
  return (
    <Glass radius={radius.sm} style={[styles.anchor, { left: space.lg, bottom }]}>
      <Pressable
        accessibilityRole="link"
        hitSlop={{ top: reach, bottom: reach }}
        onPress={() => void Linking.openURL(OSM_COPYRIGHT)}
        style={{ paddingHorizontal: space.sm, paddingVertical: space.xxs }}
      >
        <Text style={[textStyle.caption, { color: color.textSecondary }]}>
          {t("nearMe.attribution")}
        </Text>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  lift: {
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  clip: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  anchor: { position: "absolute" },
  centered: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  square: { alignItems: "center", justifyContent: "center" },
  link: { justifyContent: "center", alignSelf: "flex-start" },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
