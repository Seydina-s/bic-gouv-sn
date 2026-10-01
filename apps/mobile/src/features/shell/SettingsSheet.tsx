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
  Linking,
  Modal,
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
import { SegmentedChoice, type Segment } from "../../components/SegmentedChoice";
import type { LangChoice } from "../../i18n/I18nProvider";
import { type DataSaverPreference, useDataSaver } from "../data-saver/DataSaverProvider";
import { type UsageConsent, useUsageStats } from "../usage-stats/UsageStatsProvider";
import type { NotificationChoice, QuietChoice } from "../notifications/notification-preferences";
import { useNotifications } from "../notifications/NotificationsProvider";
import { useOnboardingDone } from "../onboarding/OnboardingProvider";
import { toggleTopic } from "../notifications/notification-preferences";
import { categoryLabelKey, SECTION_FILTERS } from "../news/category";
import { SectionChip } from "../news/SectionChip";
import { OPEN_SOURCE } from "../licences/open-source";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";

/** Data, fonts and icons the app shows, each with the licence text it asks to credit. */
const LICENCES = [
  { key: "licenceData", url: "https://www.openstreetmap.org/copyright" },
  { key: "licenceFonts", url: "https://openfontlicense.org" },
  { key: "licenceMapIcons", url: "https://github.com/tangrams/icons/blob/master/LICENSE.md" },
  {
    key: "licenceAppIcons",
    url: "https://github.com/duongdev/phosphor-react-native/blob/main/LICENSE",
  },
] as const;

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
  const [rise] = useState(() => new Animated.Value(0));

  // The panel rises from the bottom (a cut when "reduce motion" is on).
  useEffect(() => {
    if (!visible) {
      rise.setValue(0);
      return;
    }
    if (reduceMotion !== false) {
      rise.setValue(1);
      return;
    }
    const { damping, stiffness, mass } = theme.motion.spring.gentle;
    Animated.spring(rise, { toValue: 1, damping, stiffness, mass, useNativeDriver: true }).start();
  }, [visible, reduceMotion, rise, theme.motion.spring.gentle]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("settings.close")}
          onPress={close}
          style={StyleSheet.absoluteFill}
        >
          <GlassBackdrop strength="veil" />
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [space.xxxl * 2, 0],
                  }),
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
            <View style={{ gap: space.sm }}>
              <SegmentedChoice
                title={t("settings.dataSaver")}
                segments={dataSavings}
                selected={dataSaver.preference}
                onSelect={dataSaver.setPreference}
              />
              <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                {t("settings.dataSaverHelp")}
              </Text>
            </View>
            {notifications.supported && (
              <View style={{ gap: space.sm }}>
                <SegmentedChoice
                  title={t("settings.notifications")}
                  segments={notificationChoices}
                  selected={notifications.choice}
                  onSelect={notifications.setChoice}
                />
                <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                  {t("settings.notificationsHelp")}
                </Text>
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
                    <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                      {t("settings.quietHelp")}
                    </Text>
                    <Text
                      accessibilityRole="header"
                      style={[textStyle.label, { color: color.textSecondary }]}
                    >
                      {t("settings.notificationTopics")}
                    </Text>
                    <View style={[styles.chips, { gap: space.sm }]}>
                      <SectionChip
                        category={null}
                        label={t("feed.allSections")}
                        active={notifications.topics === null}
                        role="checkbox"
                        onPress={() => {
                          notifications.setTopics(toggleTopic(notifications.topics, null));
                        }}
                      />
                      {SECTION_FILTERS.map((category) => (
                        <SectionChip
                          key={category}
                          category={category}
                          label={t(categoryLabelKey(category))}
                          active={notifications.topics?.includes(category) ?? false}
                          role="checkbox"
                          onPress={() => {
                            notifications.setTopics(toggleTopic(notifications.topics, category));
                          }}
                        />
                      ))}
                    </View>
                    <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                      {t("settings.notificationTopicsHelp")}
                    </Text>
                  </>
                )}
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
              <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                {t("settings.restartWelcomeHelp")}
              </Text>
            </View>
            <View style={{ gap: space.sm }}>
              <Text
                accessibilityRole="header"
                style={[textStyle.label, { color: color.textSecondary }]}
              >
                {t("settings.about")}
              </Text>
              {(["aboutNews", "aboutProcedures", "aboutSources"] as const).map((key) => (
                <Text key={key} style={[textStyle.body, { color: color.textPrimary }]}>
                  {t(`settings.${key}`)}
                </Text>
              ))}
            </View>
            <View style={{ gap: space.sm }}>
              <Text
                accessibilityRole="header"
                style={[textStyle.label, { color: color.textSecondary }]}
              >
                {t("settings.licences")}
              </Text>
              <View>
                {LICENCES.map(({ key, url }) => (
                  <LinkRow
                    key={key}
                    label={t(`settings.${key}`)}
                    role="link"
                    onPress={() => void Linking.openURL(url)}
                  />
                ))}
                <LinkRow
                  label={t("settings.openSource", { count: OPEN_SOURCE.packages.length })}
                  role="button"
                  onPress={() => {
                    close();
                    router.push("/licences");
                  }}
                />
              </View>
              <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
                {t("settings.version", { version: Constants.expoConfig?.version ?? "—" })}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
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
