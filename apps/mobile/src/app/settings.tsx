import type { ThemePreference } from "@bgs/ui";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { DeviceMobileIcon as DeviceMobile } from "phosphor-react-native/src/icons/DeviceMobile";
import { MoonIcon as Moon } from "phosphor-react-native/src/icons/Moon";
import { SunIcon as Sun } from "phosphor-react-native/src/icons/Sun";
import { XIcon as X } from "phosphor-react-native/src/icons/X";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackdrop } from "../components/GlassBackdrop";
import { IconButton } from "../components/IconButton";
import { SegmentedChoice, type Segment } from "../components/SegmentedChoice";
import type { LangChoice } from "../i18n/I18nProvider";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/**
 * Settings as a frosted-glass sheet over the page the reader came from, which stays
 * visible, blurred, behind it. Appearance and language are chosen like tabs; a tap
 * outside the sheet, the close button or the back gesture closes it.
 */
export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const { t, choice, setLang } = useTranslation();
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
  const close = () => {
    router.back();
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("settings.close")}
        onPress={close}
        style={StyleSheet.absoluteFill}
      >
        <GlassBackdrop strength="veil" />
      </Pressable>
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
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
            <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
              {t("settings.version", { version: Constants.expoConfig?.version ?? "—" })}
            </Text>
          </View>
        </ScrollView>
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
  flex: { flex: 1 },
});
