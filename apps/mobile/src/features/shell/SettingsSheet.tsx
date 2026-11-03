import type { ThemePreference } from "@bgs/ui";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { BellIcon as Bell } from "phosphor-react-native/src/icons/Bell";
import { BellSlashIcon as BellSlash } from "phosphor-react-native/src/icons/BellSlash";
import { ChartBarIcon as ChartBar } from "phosphor-react-native/src/icons/ChartBar";
import { CellSignalHighIcon as CellSignalHigh } from "phosphor-react-native/src/icons/CellSignalHigh";
import { DeviceMobileIcon as DeviceMobile } from "phosphor-react-native/src/icons/DeviceMobile";
import { EyeSlashIcon as EyeSlash } from "phosphor-react-native/src/icons/EyeSlash";
import { ImageIcon } from "phosphor-react-native/src/icons/Image";
import { LeafIcon as Leaf } from "phosphor-react-native/src/icons/Leaf";
import { MoonIcon as Moon } from "phosphor-react-native/src/icons/Moon";
import { SunIcon as Sun } from "phosphor-react-native/src/icons/Sun";
import { XIcon as X } from "phosphor-react-native/src/icons/X";
import { useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { IconButton } from "../../components/IconButton";
import { LinkRow } from "../../components/LinkRow";
import { useLocation } from "../location/LocationProvider";
import { SegmentedChoice, type Segment } from "../../components/SegmentedChoice";
import type { LangChoice } from "../../i18n/I18nProvider";
import { type DataSaverPreference, useDataSaver } from "../data-saver/DataSaverProvider";
import { type UsageConsent, useUsageStats } from "../usage-stats/UsageStatsProvider";
import type { NotificationChoice, QuietChoice } from "../notifications/notification-preferences";
import { useNotifications } from "../notifications/NotificationsProvider";
import { useOnboardingDone } from "../onboarding/OnboardingProvider";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";

/**
 * Settings as a pop-up laid over the current screen, never a new page: the screen
 * stays in place underneath, visible through the blurred glass, and is still there
 * when the pop-up closes. Closed by a tap outside, the close button or the back
 * button (Android).
 */
export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, preference, setPreference } = useTheme();
  const { t, choice, setLang } = useTranslation();
  const dataSaver = useDataSaver();
  const usageStats = useUsageStats();
  const notifications = useNotifications();
  const location = useLocation();
  const onboarding = useOnboardingDone();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle, radius, layout } = theme;

  const themes: Segment<ThemePreference>[] = [
    {
      value: "system",
      label: t("settings.auto"),
      spokenLabel: t("settings.themeSystem"),
      icon: DeviceMobile,
    },
    { value: "light", label: t("settings.themeLight"), icon: Sun },
    { value: "dark", label: t("settings.themeDark"), icon: Moon },
  ];
  const languages: Segment<LangChoice>[] = [
    {
      value: "auto",
      label: t("settings.auto"),
      spokenLabel: t("settings.languageAuto"),
      icon: DeviceMobile,
    },
    { value: "fr", label: t("settings.languageFr"), icon: "FR" },
    { value: "wo", label: t("settings.languageWo"), icon: "WO" },
    { value: "en", label: t("settings.languageEn"), icon: "EN" },
  ];
  const dataSavings: Segment<DataSaverPreference>[] = [
    { value: "never", label: t("settings.dataSaverNever"), icon: ImageIcon },
    {
      value: "cellular",
      label: t("settings.dataSaverCellular"),
      spokenLabel: t("settings.dataSaverCellularSpoken"),
      icon: CellSignalHigh,
    },
    { value: "always", label: t("settings.dataSaverAlways"), icon: Leaf },
  ];
  const usageChoices: Segment<UsageConsent>[] = [
    { value: "off", label: t("settings.usageStatsOff"), icon: EyeSlash },
    {
      value: "on",
      label: t("settings.usageStatsOn"),
      spokenLabel: t("settings.usageStatsOnSpoken"),
      icon: ChartBar,
    },
  ];
  const notificationChoices: Segment<NotificationChoice>[] = [
    { value: "off", label: t("settings.notificationsOff"), icon: BellSlash },
    {
      value: "on",
      label: t("settings.notificationsOn"),
      spokenLabel: t("settings.notificationsOnSpoken"),
      icon: Bell,
    },
  ];
  const quietChoices: Segment<QuietChoice>[] = [
    {
      value: "on",
      label: t("settings.quietOn"),
      spokenLabel: t("settings.quietOnSpoken"),
      icon: Moon,
    },
    { value: "off", label: t("settings.quietOff"), icon: Bell },
  ];
  const close = onClose;
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(visible);
  const [presence] = useState(() => new Animated.Value(0));
  // Opened: the window comes first, then the panel appears in it.
  if (visible && !shown) {
    setShown(true);
  }

  // Android's back gesture closes the sheet, as a native window did.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [visible, close]);

  // One movement for the veil and the panel (owner's request, 15/10/2026: the old fade
  // of the window and the cut of the panel left letters on screen as it closed). In:
  // the panel rises a little as it appears; out: both fade together, faster, and the
  // window closes only once they are gone. A plain fade when motion is reduced.
  useEffect(() => {
    if (!shown) {
      return undefined;
    }
    const { duration } = theme.motion;
    const animation = Animated.timing(presence, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.normal : duration.exitNormal,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setShown(false);
      }
    });
    return () => {
      animation.stop();
    };
  }, [visible, shown, presence, theme.motion]);

  const rise = reduceMotion === false ? space.xl : 0;

  if (!shown) {
    return null;
  }
  // Laid in the app's own tree, not in a native window: the cross-fade between light
  // and dark modes then covers the sheet too, and Android's picture of the screen
  // includes it (UX-02, 17/10/2026: a native window stayed above the fade).
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.close")}
          onPress={close}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: presence }]}>
            <GlassBackdrop strength="veil" />
          </Animated.View>
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              opacity: presence,
              transform: [
                {
                  translateY: presence.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }),
                },
              ],
            },
            {
              maxWidth: layout.readingMaxWidth,
              borderTopLeftRadius: radius.lg + space.sm,
              borderTopRightRadius: radius.lg + space.sm,
              borderColor: color.glassBorder,
              shadowColor: color.scrim,
            },
          ]}
        >
          <GlassBackdrop />
          <ScrollView
            contentContainerStyle={{
              padding: space.xl,
              paddingBottom: insets.bottom + space.xl,
              gap: space.xl,
            }}
          >
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={[textStyle.title, styles.flex, { color: color.textPrimary }]}
              >
                {t("settings.title")}
              </Text>
              <IconButton icon={X} label={t("settings.close")} onPress={close} />
            </View>
            <SegmentedChoice
              title={t("settings.appearance")}
              segments={themes}
              selected={preference}
              onSelect={setPreference}
            />
            <SegmentedChoice
              title={t("settings.language")}
              segments={languages}
              selected={choice}
              onSelect={setLang}
            />
            <SegmentedChoice
              title={t("settings.dataSaver")}
              segments={dataSavings}
              selected={dataSaver.preference}
              onSelect={dataSaver.setPreference}
            />
            {notifications.supported && (
              <View style={{ gap: space.sm }}>
                <SegmentedChoice
                  title={t("settings.notifications")}
                  segments={notificationChoices}
                  selected={notifications.choice}
                  onSelect={(next) => {
                    void notifications.setChoice(next);
                  }}
                />
                {notifications.blocked && (
                  <View>
                    <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>
                      {t("settings.notificationsBlocked")}
                    </Text>
                    <LinkRow
                      label={t("settings.openPhoneSettings")}
                      role="button"
                      onPress={() => void Linking.openSettings()}
                    />
                  </View>
                )}
                {notifications.choice === "on" && (
                  <>
                    <SegmentedChoice
                      title={t("settings.quietHours")}
                      segments={quietChoices}
                      selected={notifications.quiet}
                      onSelect={notifications.setQuiet}
                    />
                  </>
                )}
              </View>
            )}
            {location.supported && (
              <View style={{ gap: space.sm }}>
                <Text
                  accessibilityRole="header"
                  style={[textStyle.label, { color: color.textSecondary }]}
                >
                  {t("settings.location")}
                </Text>
                {location.status === "found" ? (
                  <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>
                    {t("settings.locationOn")}
                  </Text>
                ) : location.status === "denied" ? (
                  <View>
                    <Text style={[textStyle.bodySmall, { color: color.textPrimary }]}>
                      {t("settings.locationDenied")}
                    </Text>
                    <LinkRow
                      label={t("settings.openPhoneSettings")}
                      role="button"
                      onPress={() => void Linking.openSettings()}
                    />
                  </View>
                ) : (
                  <LinkRow
                    label={t("settings.locationAllow")}
                    role="button"
                    onPress={() => void location.locate()}
                  />
                )}
                <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                  {t("settings.locationHelp")}
                </Text>
              </View>
            )}
            <View style={{ gap: space.sm }}>
              <SegmentedChoice
                title={t("settings.usageStats")}
                segments={usageChoices}
                selected={usageStats.consent}
                onSelect={usageStats.setConsent}
              />
              <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                {t("settings.usageStatsHelp")}
              </Text>
            </View>
            <View style={{ gap: space.sm }}>
              <Text
                accessibilityRole="header"
                style={[textStyle.label, { color: color.textSecondary }]}
              >
                {t("settings.welcome")}
              </Text>
              <LinkRow
                label={t("settings.restartWelcome")}
                role="button"
                onPress={() => {
                  close();
                  onboarding.restart();
                }}
              />
            </View>
            <View style={{ gap: space.sm }}>
              <Text
                accessibilityRole="header"
                style={[textStyle.label, { color: color.textSecondary }]}
              >
                {t("settings.about")}
              </Text>
              <Text style={[textStyle.body, { color: color.textPrimary }]}>
                {t("settings.aboutApp")}
              </Text>
            </View>
            <View>
              <LinkRow
                label={t("settings.licencesLink")}
                role="button"
                onPress={() => {
                  close();
                  router.push("/licences");
                }}
              />
              <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
                {t("settings.version", { version: Constants.expoConfig?.version ?? "—" })}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxHeight: "88%",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    elevation: 12,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
  },
  header: { flexDirection: "row", alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  flex: { flex: 1 },
});
