import type { ProcedureThemesResponse } from "@bgs/shared-types";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { BriefcaseIcon as Briefcase } from "phosphor-react-native/src/icons/Briefcase";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { BusIcon as Bus } from "phosphor-react-native/src/icons/Bus";
import { ChartLineUpIcon as ChartLineUp } from "phosphor-react-native/src/icons/ChartLineUp";
import { FactoryIcon as Factory } from "phosphor-react-native/src/icons/Factory";
import { FileTextIcon as FileText } from "phosphor-react-native/src/icons/FileText";
import { FingerprintIcon as Fingerprint } from "phosphor-react-native/src/icons/Fingerprint";
import { GraduationCapIcon as GraduationCap } from "phosphor-react-native/src/icons/GraduationCap";
import { IdentificationBadgeIcon as IdentificationBadge } from "phosphor-react-native/src/icons/IdentificationBadge";
import { LightningIcon as Lightning } from "phosphor-react-native/src/icons/Lightning";
import { MaskHappyIcon as MaskHappy } from "phosphor-react-native/src/icons/MaskHappy";
import { PlantIcon as Plant } from "phosphor-react-native/src/icons/Plant";
import { ScalesIcon as Scales } from "phosphor-react-native/src/icons/Scales";
import { StethoscopeIcon as Stethoscope } from "phosphor-react-native/src/icons/Stethoscope";
import { SwimmingPoolIcon as SwimmingPool } from "phosphor-react-native/src/icons/SwimmingPool";
import { TreeIcon as Tree } from "phosphor-react-native/src/icons/Tree";
import { UsersFourIcon as UsersFour } from "phosphor-react-native/src/icons/UsersFour";
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import { WalletIcon as Wallet } from "phosphor-react-native/src/icons/Wallet";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

type Theme = ProcedureThemesResponse["themes"][number];

/** The source's icons (Font Awesome names) drawn with our own icon family. */
const GLYPHS: Record<string, ComponentType<PhosphorProps>> = {
  "fa-fingerprint": Fingerprint,
  "fa-swimmer": SwimmingPool,
  "fa-bus-alt": Bus,
  "fa-stethoscope": Stethoscope,
  "fa-graduation-cap": GraduationCap,
  "fa-venus-mars": UsersThree,
  "fa-briefcase": Briefcase,
  "fa-building": Buildings,
  "fa-users": UsersFour,
  "fa-balance-scale-left": Scales,
  "fa-user-chart": ChartLineUp,
  "fa-sign-language": MaskHappy,
  "fa-users-cog": Factory,
  "fa-users-class": IdentificationBadge,
  "fa-wallet": Wallet,
  // Themes the platform added (no official theme fits these procedures).
  "fa-seedling": Plant,
  "fa-tree": Tree,
  "fa-bolt": Lightning,
};

/** Cards per row: two on phones, more as the window widens (tablets, unfolded). */
function columnsFor(width: number): number {
  return Math.max(2, Math.min(5, Math.floor(width / 180)));
}

/**
 * The official themes as upright cards (icon, name, number of procedures). Only
 * themes holding procedures a person has validated are shown.
 */
export function ThemeCards({
  themes,
  onOpen,
}: {
  themes: Theme[];
  onOpen: (theme: Theme) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { color, space, textStyle, radius, layout } = theme;
  const shown = themes.filter((item) => item.count > 0);
  if (shown.length === 0) {
    return null;
  }
  const columns = columnsFor(Math.min(width, layout.readingMaxWidth + space.xxxl));
  const basis = `${String(100 / columns)}%` as `${number}%`;

  return (
    <View style={{ gap: space.md }}>
      <Text accessibilityRole="header" style={[textStyle.subtitle, { color: color.textPrimary }]}>
        {t("procedures.byTheme")}
      </Text>
      <View style={[styles.grid, { marginHorizontal: -space.xs }]}>
        {shown.map((item) => {
          const count = t("procedures.count", { count: item.count });
          return (
            <View key={item.id} style={{ width: basis, padding: space.xs }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${count}`}
                onPress={() => {
                  onOpen(item);
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderRadius: radius.lg,
                    borderColor: color.border,
                    backgroundColor: color.surfaceRaised,
                    padding: space.md,
                    gap: space.sm,
                    opacity: pressed ? theme.opacity.cardPressed : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badge,
                    {
                      width: theme.touchTarget.min,
                      height: theme.touchTarget.min,
                      borderRadius: radius.full,
                      backgroundColor: color.primaryContainer,
                    },
                  ]}
                >
                  <Icon
                    icon={GLYPHS[item.icon ?? ""] ?? FileText}
                    weight="duotone"
                    color={color.onPrimaryContainer}
                  />
                </View>
                <Text
                  numberOfLines={4}
                  style={[textStyle.label, styles.flex, { color: color.textPrimary }]}
                >
                  {item.title}
                </Text>
                <Text style={[textStyle.caption, { color: color.textSecondary }]}>{count}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  // Upright but compact: 15 themes stay quick to scan.
  card: { aspectRatio: 5 / 6, borderWidth: StyleSheet.hairlineWidth },
  badge: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
