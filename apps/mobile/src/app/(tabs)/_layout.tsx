import { Tabs } from "expo-router";
import { FileTextIcon as FileText } from "phosphor-react-native/src/icons/FileText";
import { HouseIcon as House } from "phosphor-react-native/src/icons/House";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { SparkleIcon as Sparkle } from "phosphor-react-native/src/icons/Sparkle";
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

const TAB_BAR_HEIGHT = 64;

function tabIcon(glyph: ComponentType<PhosphorProps>) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // Tab tints come from our tokens, always plain strings.
    return <Icon icon={glyph} color={String(color)} weight={focused ? "fill" : "regular"} />;
  };
}

/** The five sections of the reference mockup; icons always come with their label. */
export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, textStyle } = theme;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.textBrand,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarStyle: {
          backgroundColor: color.background,
          borderTopColor: color.border,
          // Room for icon + label at every font scale, above the system gesture bar.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: textStyle.caption.fontFamily,
          fontSize: textStyle.caption.fontSize,
          lineHeight: textStyle.caption.lineHeight,
          // Never squeezed by the icon: a clipped label is unreadable.
          flexShrink: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen
        name="near-me"
        options={{ title: t("tabs.nearMe"), tabBarIcon: tabIcon(MapPin) }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: t("tabs.assistant"), tabBarIcon: tabIcon(Sparkle) }}
      />
      <Tabs.Screen
        name="procedures"
        options={{ title: t("tabs.procedures"), tabBarIcon: tabIcon(FileText) }}
      />
      <Tabs.Screen
        name="participate"
        options={{ title: t("tabs.participate"), tabBarIcon: tabIcon(UsersThree) }}
      />
    </Tabs>
  );
}
