import type { ThemePreference } from "@bgs/ui";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { CheckIcon as Check } from "phosphor-react-native/src/icons/Check";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import type { LangChoice } from "../i18n/I18nProvider";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

interface ChoiceListProps<T extends string> {
  title: string;
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

/** One group of exclusive options (radio buttons), each a full-width 48 dp row. */
function ChoiceList<T extends string>({ title, options, selected, onSelect }: ChoiceListProps<T>) {
  const { theme } = useTheme();
  const { color, space, textStyle, touchTarget } = theme;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={title} style={{ marginTop: space.xl }}>
      <Text
        accessibilityRole="header"
        style={[textStyle.subtitle, { color: color.textPrimary, marginBottom: space.sm }]}
      >
        {title}
      </Text>
      {options.map((option) => {
        const checked = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => {
              onSelect(option.value);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                minHeight: touchTarget.min,
                borderBottomColor: color.border,
                backgroundColor: pressed ? color.surface : color.background,
              },
            ]}
          >
            <Text style={[textStyle.body, styles.label, { color: color.textPrimary }]}>
              {option.label}
            </Text>
            {checked && <Icon icon={Check} weight="bold" color={color.textBrand} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Settings: appearance and language (remembered on the phone), and about. */
export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const { t, choice, setLang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle } = theme;

  const themes: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];
  const languages: { value: LangChoice; label: string }[] = [
    { value: "auto", label: t("settings.languageAuto") },
    { value: "fr", label: t("settings.languageFr") },
    { value: "wo", label: t("settings.languageWo") },
  ];

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("settings.title"),
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: insets.bottom + space.xxxl,
          alignSelf: "center",
          width: "100%",
          maxWidth: theme.layout.readingMaxWidth,
        }}
      >
        <ChoiceList
          title={t("settings.appearance")}
          options={themes}
          selected={preference}
          onSelect={setPreference}
        />
        <ChoiceList
          title={t("settings.language")}
          options={languages}
          selected={choice}
          onSelect={setLang}
        />
        <Text style={[textStyle.bodySmall, { color: color.textSecondary, marginTop: space.sm }]}>
          {t("settings.wolofNote")}
        </Text>
        <Text
          accessibilityRole="header"
          style={[textStyle.subtitle, { color: color.textPrimary, marginTop: space.xxl }]}
        >
          {t("settings.about")}
        </Text>
        <Text style={[textStyle.body, { color: color.textSecondary, marginTop: space.sm }]}>
          {t("settings.aboutBody")}
        </Text>
        <Text style={[textStyle.bodySmall, { color: color.textTertiary, marginTop: space.md }]}>
          {t("settings.version", { version: Constants.expoConfig?.version ?? "—" })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1 },
});
