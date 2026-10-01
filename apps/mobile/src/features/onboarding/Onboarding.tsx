import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { CheckIcon as Check } from "phosphor-react-native/src/icons/Check";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { SectionTag } from "../news/SectionTag";
import { WovenIn } from "../news/WovenIn";
import { OnboardingPath } from "./OnboardingPath";

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
            aria-checked={checked}
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
  station: string;
  title: string;
  body: string;
  demo: ReactNode;
}

/**
 * First-run welcome (CLAUDE.md §1) as a road (direction A, chosen by the user on
 * 01/10/2026): the language first, then one idea per station, each showing a real
 * piece of the app. Validating a step draws the road to the next station while
 * its card rises in. "Passer" is always visible. Only features that exist today
 * are presented; permissions are asked later, when they serve.
 */
export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const { color, space, textStyle, radius, touchTarget, motion } = theme;

  const pages: Page[] = [
    {
      station: t("onboarding.stations.language"),
      title: t("onboarding.languageTitle"),
      body: t("onboarding.languageBody"),
      demo: <LanguageChoice />,
    },
    {
      station: t("onboarding.stations.news"),
      title: t("onboarding.newsTitle"),
      body: t("onboarding.newsBody"),
      demo: <SectionsDemo />,
    },
    {
      station: t("onboarding.stations.source"),
      title: t("onboarding.sourceTitle"),
      body: t("onboarding.sourceBody"),
      demo: <SourceDemo />,
    },
    {
      station: t("onboarding.stations.offline"),
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
        { backgroundColor: color.background, paddingTop: insets.top + space.md },
      ]}
    >
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
      <OnboardingPath index={index} labels={pages.map((item) => item.station)} />
      <View
        style={[
          styles.sheet,
          {
            paddingTop: space.xl,
            paddingBottom: insets.bottom + space.lg,
            borderTopLeftRadius: radius.lg + space.sm,
            borderTopRightRadius: radius.lg + space.sm,
            backgroundColor: color.background,
            shadowColor: color.scrim,
          },
        ]}
      >
        {/* Large text stays reachable: the card scrolls, never more than half the screen.
            Focusable, so a keyboard can scroll it too when a step has no button inside. */}
        <ScrollView
          focusable
          style={{ maxHeight: height / 2 }}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: space.xl, maxWidth: theme.layout.readingMaxWidth },
          ]}
        >
          {page !== undefined && (
            <Animated.View
              key={index}
              entering={FadeInDown.duration(motion.duration.slow).easing(
                Easing.bezier(...motion.easing.emphasized),
              )}
              style={{ gap: space.lg }}
            >
              <Text
                accessibilityRole="header"
                style={[textStyle.headline, { color: color.textPrimary }]}
              >
                {page.title}
              </Text>
              <Text style={[textStyle.body, { color: color.textSecondary }]}>{page.body}</Text>
              <View>{page.demo}</View>
            </Animated.View>
          )}
        </ScrollView>
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.lg }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  top: { justifyContent: "space-between" },
  skip: { justifyContent: "center" },
  content: { alignSelf: "center", width: "100%" },
  sheet: {
    elevation: 12,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
  },
  language: { flexDirection: "row", alignItems: "center", borderWidth: 1 },
  flex: { flex: 1 },
  badge: { alignSelf: "flex-start" },
  primary: { alignItems: "center", justifyContent: "center" },
});
