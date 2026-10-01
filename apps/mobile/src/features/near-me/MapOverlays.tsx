import { CheckCircleIcon as CheckCircle } from "phosphor-react-native/src/icons/CheckCircle";
import { DownloadSimpleIcon as DownloadSimple } from "phosphor-react-native/src/icons/DownloadSimple";
import { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
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
import type { OfflineAreaState } from "./useOfflineArea";

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
  top,
  left = 0,
}: {
  message: string;
  /** The way out, when there is one to offer (none when the list is already beside). */
  action?: { label: string; onPress: () => void } | undefined;
  top: number;
  /** Where the map starts (a panel may sit on its left). */
  left?: number;
}) {
  const { theme } = useTheme();
  const { color, space, radius, textStyle, touchTarget } = theme;
  return (
    <Glass
      radius={radius.lg}
      style={[styles.anchor, { top, left: left + space.lg, right: space.lg }]}
    >
      <View accessibilityLiveRegion="polite" style={{ padding: space.md, gap: space.xs }}>
        <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>{message}</Text>
        {action !== undefined && (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={[styles.link, { minHeight: touchTarget.min }]}
          >
            <Text style={[textStyle.label, { color: color.textBrand }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </Glass>
  );
}

/** Keeps the streets around the place on the phone: size first, then progress. */
export function OfflineAreaButton({
  state,
  onKeep,
  top,
}: {
  state: OfflineAreaState;
  onKeep: () => void;
  top: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  const label =
    state.kind === "idle"
      ? t("nearMe.keepOffline", { size: String(state.megabytes) })
      : state.kind === "saving"
        ? t("nearMe.keepingOffline", { percent: String(state.percent) })
        : state.kind === "saved"
          ? t("nearMe.keptOffline")
          : t("nearMe.keepOfflineFailed");
  const actionable = state.kind === "idle" || state.kind === "failed";
  return (
    <Glass radius={radius.full} style={[styles.anchor, { top, right: space.lg }]}>
      <Pressable
        accessibilityRole={actionable ? "button" : "text"}
        accessibilityLiveRegion="polite"
        disabled={!actionable}
        onPress={onKeep}
        style={({ pressed }) => [
          styles.row,
          {
            minHeight: touchTarget.min,
            gap: space.sm,
            paddingHorizontal: space.lg,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        <Icon
          icon={state.kind === "saved" ? CheckCircle : DownloadSimple}
          size="sm"
          weight={state.kind === "saved" ? "fill" : "regular"}
          color={color.textBrand}
        />
        <Text style={[textStyle.label, { color: color.textPrimary }]}>{label}</Text>
      </Pressable>
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
