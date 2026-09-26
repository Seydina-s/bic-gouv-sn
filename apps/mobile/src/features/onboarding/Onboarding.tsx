import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { CheckIcon as Check } from "phosphor-react-native/src/icons/Check";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Baobab } from "../../components/Baobab";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { SectionTag } from "../news/SectionTag";
import { WovenIn } from "../news/WovenIn";

/** Language picker: the two official languages, named in their own words. */
function LanguageChoice() {
  const { theme } = useTheme();
  const { t, lang, choice, setLang } = useTranslation();
  // At first launch the language follows the phone: that one is shown as chosen.
  const current = choice === "auto" ? lang : choice;
  const { color, space, textStyle, radius, touchTarget } = theme;
  const options = [
    { value: "fr" as const, label: t("settings.languageFr") },
    { value: "wo" as const, label: t("settings.languageWo") },
  ];
  return (
    <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
      {options.map((option) => {
        const checked = current === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => {
              setLang(option.value);
            }}
            style={[
              styles.language,
              {
                minHeight: touchTarget.min + space.md,
                paddingHorizontal: space.lg,
                borderRadius: radius.md,
                borderColor: checked ? color.primary : color.borderStrong,
                backgroundColor: checked ? color.primaryContainer : color.background,
              },
            ]}
          >
            <Text style={[textStyle.subtitle, styles.flex, { color: color.textPrimary }]}>
              {option.label}
            </Text>
            {checked && <Icon icon={Check} weight="bold" color={color.onPrimaryContainer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mini demo of the real interface: the woven section names of the front page. */
function SectionsDemo() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.space.md }}>
      {["conseil-des-ministres", "communiques", "discours"].map((category, index) => (
        <WovenIn key={category} index={index}>
          <SectionTag category={category} />
        </WovenIn>
      ))}
    </View>
  );
}

function SourceDemo() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  return (
    <View style={[styles.row, { gap: space.sm }]}>
      <Icon icon={ArrowSquareOut} color={color.textBrand} />
      <Text style={[textStyle.label, { color: color.textBrand }]}>
        {t("article.openSource", { source: "presidence.sn" })}
      </Text>
    </View>
  );
}

function OfflineDemo() {
  const { theme } = useTheme();
  const { color, space } = theme;
  return (
    <View
      style={[
        styles.badge,
        {
          padding: space.lg,
          borderRadius: theme.radius.full,
          backgroundColor: color.primaryContainer,
        },
      ]}
    >
      <Icon icon={BookmarkSimple} size="lg" weight="fill" color={color.onPrimaryContainer} />
    </View>
  );
}

interface Page {
  title: string;
  body: string;
  demo: ReactNode;
}

/**
 * First-run welcome (CLAUDE.md §1): the language first, then one idea per screen,
 * each showing a real piece of the app. "Passer" is always visible. Only features
 * that exist today are presented; permissions are asked later, when they serve.
 */
export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const { color, space, textStyle, radius, touchTarget } = theme;

  const pages: Page[] = [
    {
      title: t("onboarding.languageTitle"),
      body: t("onboarding.languageBody"),
      demo: <LanguageChoice />,
    },
    { title: t("onboarding.newsTitle"), body: t("onboarding.newsBody"), demo: <SectionsDemo /> },
    { title: t("onboarding.sourceTitle"), body: t("onboarding.sourceBody"), demo: <SourceDemo /> },
    {
      title: t("onboarding.offlineTitle"),
      body: t("onboarding.offlineBody"),
      demo: <OfflineDemo />,
    },
  ];
  const page = pages[index] ?? pages[0];
  const last = index === pages.length - 1;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: color.background,
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.lg,
        },
      ]}
    >
      <View style={[styles.watermark, { top: insets.top + space.xxxl }]}>
        <Baobab size={240} color={color.textBrand} opacity={theme.opacity.watermark} />
      </View>
      <View style={[styles.row, styles.top, { paddingHorizontal: space.lg }]}>
        <Text style={[textStyle.caption, { color: color.textSecondary }]}>
          {t("onboarding.step", { current: index + 1, total: pages.length })}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          style={[styles.skip, { minHeight: touchTarget.min, paddingHorizontal: space.md }]}
        >
          <Text style={[textStyle.label, { color: color.textBrand }]}>{t("onboarding.skip")}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: space.xl, gap: space.xl, maxWidth: theme.layout.readingMaxWidth },
        ]}
      >
        {page !== undefined && (
          <>
            <Text
              accessibilityRole="header"
              style={[textStyle.headline, { color: color.textPrimary }]}
            >
              {page.title}
            </Text>
            <Text style={[textStyle.body, { color: color.textSecondary }]}>{page.body}</Text>
            <View key={index}>{page.demo}</View>
          </>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: space.xl }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (last) {
              onFinish();
            } else {
              setIndex(index + 1);
            }
          }}
          style={({ pressed }) => [
            styles.primary,
            {
              minHeight: touchTarget.min,
              borderRadius: radius.md,
              backgroundColor: pressed ? color.primaryPressed : color.primary,
            },
          ]}
        >
          <Text style={[textStyle.label, { color: color.onPrimary }]}>
            {last ? t("onboarding.start") : t("onboarding.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  watermark: { position: "absolute", right: -40 },
  row: { flexDirection: "row", alignItems: "center" },
  top: { justifyContent: "space-between" },
  skip: { justifyContent: "center" },
  content: { flexGrow: 1, justifyContent: "center", alignSelf: "center", width: "100%" },
  language: { flexDirection: "row", alignItems: "center", borderWidth: 1 },
  flex: { flex: 1 },
  badge: { alignSelf: "flex-start" },
  primary: { alignItems: "center", justifyContent: "center" },
});
