import { Tabs } from "expo-router";
import { FileTextIcon as FileText } from "phosphor-react-native/src/icons/FileText";
import { HouseIcon as House } from "phosphor-react-native/src/icons/House";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { SparkleIcon as Sparkle } from "phosphor-react-native/src/icons/Sparkle";
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { GlassTabBar } from "../../components/GlassTabBar";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

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

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Screens run beneath the floating glass bar; they pad their own content.
        sceneStyle: { backgroundColor: theme.color.background },
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
