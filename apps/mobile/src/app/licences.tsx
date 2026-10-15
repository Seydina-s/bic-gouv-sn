import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { CaretDownIcon as CaretDown } from "phosphor-react-native/src/icons/CaretDown";
import { useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { ScrollTopButton, useScrollTop } from "../components/ScrollTopButton";
import { OPEN_SOURCE, type OpenSourcePackage } from "../features/licences/open-source";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/** The data, fonts and icons the app shows, each with its licence. */
const CREDITS = [
  { key: "licenceData", url: "https://www.openstreetmap.org/copyright" },
  { key: "licenceFonts", url: "https://openfontlicense.org" },
  { key: "licenceMapIcons", url: "https://github.com/tangrams/icons/blob/master/LICENSE.md" },
  {
    key: "licenceAppIcons",
    url: "https://github.com/duongdev/phosphor-react-native/blob/main/LICENSE",
  },
] as const;

/** One package: its name and licence; opened, its copyright, licence text and site. */
function PackageRow({ item }: { item: OpenSourcePackage }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { color, space, textStyle, touchTarget } = theme;
  return (
    <View style={[styles.row, { borderTopColor: color.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={t("licences.openHint")}
        onPress={() => {
          setOpen((current) => !current);
        }}
        style={({ pressed }) => [
          styles.header,
          {
            minHeight: touchTarget.min,
            gap: space.md,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            backgroundColor: pressed ? color.surface : undefined,
          },
        ]}
      >
        <View style={styles.flex}>
          <Text style={[textStyle.body, { color: color.textPrimary }]}>
            {`${item.name} ${item.version}`}
          </Text>
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{item.licence}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <Icon icon={CaretDown} size="sm" color={color.textTertiary} />
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
          {item.copyright.map((line) => (
            <Text key={line} style={[textStyle.bodySmall, { color: color.textPrimary }]}>
              {line}
            </Text>
          ))}
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
            {OPEN_SOURCE.texts[item.text]}
          </Text>
          {item.url !== null && (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(item.url ?? "")}
              style={[styles.link, { minHeight: touchTarget.min }]}
            >
              <Text style={[textStyle.label, { color: color.textBrand }]}>
                {t("licences.projectSite")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Software and licences, reached by one button of the settings (owner's request,
 * 15/10/2026): the data, fonts and icons credited, then the free software that makes
 * the app work, as shipped, each opening on its copyright and licence (LIC-01).
 */
export default function LicencesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const list = useRef<FlashListRef<OpenSourcePackage>>(null);
  const scrollTop = useScrollTop();
  const { color, space, textStyle, touchTarget } = theme;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("licences.title"),
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <FlashList
        ref={list}
        onScroll={scrollTop.onScroll}
        scrollEventThrottle={100}
        data={OPEN_SOURCE.packages}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <PackageRow item={item} />}
        ListHeaderComponent={
          <View style={{ padding: space.lg, gap: space.md }}>
            <Text
              accessibilityRole="header"
              style={[textStyle.subtitle, { color: color.textPrimary }]}
            >
              {t("licences.creditsTitle")}
            </Text>
            {CREDITS.map(({ key, url }) => (
              <Pressable
                key={key}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(url)}
                style={[styles.link, { minHeight: touchTarget.min }]}
              >
                <Text style={[textStyle.body, { color: color.textBrand }]}>
                  {t(`licences.${key}`)}
                </Text>
              </Pressable>
            ))}
            <Text
              accessibilityRole="header"
              style={[textStyle.subtitle, { color: color.textPrimary }]}
            >
              {t("licences.voicesTitle")}
            </Text>
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("licences.voiceFrench")}
            </Text>
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("licences.voiceWolof")}
            </Text>
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("licences.intro", { count: OPEN_SOURCE.packages.length })}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
        testID="licences-list"
      />
      <ScrollTopButton
        visible={scrollTop.visible}
        progress={scrollTop.progress}
        bottom={insets.bottom + space.lg}
        onPress={() => {
          list.current?.scrollToOffset({ offset: 0, animated: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { borderTopWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  link: { justifyContent: "center", alignSelf: "flex-start" },
});
