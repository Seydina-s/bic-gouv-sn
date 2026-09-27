import { withAlpha } from "@bgs/ui";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { CalendarCheckIcon as CalendarCheck } from "phosphor-react-native/src/icons/CalendarCheck";
import { CaretDownIcon as CaretDown } from "phosphor-react-native/src/icons/CaretDown";
import { CertificateIcon as Certificate } from "phosphor-react-native/src/icons/Certificate";
import { CoinsIcon as Coins } from "phosphor-react-native/src/icons/Coins";
import { FilesIcon as Files } from "phosphor-react-native/src/icons/Files";
import { GlobeIcon as Globe } from "phosphor-react-native/src/icons/Globe";
import { HourglassIcon as Hourglass } from "phosphor-react-native/src/icons/Hourglass";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import type { BriefFact, BriefKind } from "./procedure-page";

const ICONS: Record<BriefKind, ComponentType<PhosphorProps>> = {
  who: UsersThree,
  documents: Files,
  cost: Coins,
  time: Hourglass,
  validity: CalendarCheck,
  result: Certificate,
  where: MapPin,
  online: Globe,
};

function useBriefLabels(): Record<BriefKind, string> {
  const { t } = useTranslation();
  return {
    who: t("procedures.briefWho"),
    documents: t("procedures.documents"),
    cost: t("procedures.cost"),
    time: t("procedures.delay"),
    validity: t("procedures.briefValidity"),
    result: t("procedures.briefResult"),
    where: t("procedures.offices"),
    online: t("procedures.online"),
  };
}

/**
 * "En bref" (Service-Public.fr): the answers people look for first, in one panel.
 * The documents line leads to the checklist further down.
 */
export function ProcedureBrief({
  facts,
  onShowSection,
}: {
  facts: BriefFact[];
  onShowSection: (section: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const labels = useBriefLabels();
  const { color, space, textStyle, radius, touchTarget, opacity } = theme;
  if (facts.length === 0) {
    return null;
  }
  const ink = color.onPrimaryContainer;

  return (
    <View
      style={{
        backgroundColor: color.primaryContainer,
        borderRadius: radius.lg,
        paddingHorizontal: space.lg,
        paddingTop: space.lg,
        paddingBottom: space.xs,
      }}
    >
      <Text accessibilityRole="header" style={[textStyle.subtitle, { color: ink }]}>
        {t("procedures.brief")}
      </Text>
      {facts.map((fact, index) => {
        const label = labels[fact.kind];
        const section = fact.section;
        const line = [
          styles.line,
          {
            gap: space.md,
            minHeight: touchTarget.min,
            paddingVertical: space.md,
            borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderTopColor: withAlpha(ink, opacity.pressed),
          },
        ];
        const content = (
          <>
            <Icon icon={ICONS[fact.kind]} weight="duotone" color={ink} />
            <View style={styles.flex}>
              <Text style={[textStyle.bodySmall, { color: ink }]}>{label}</Text>
              <Text
                style={[textStyle.body, { color: ink, fontFamily: textStyle.subtitle.fontFamily }]}
              >
                {fact.value}
              </Text>
            </View>
            {section !== null && <Icon icon={CaretDown} size="sm" color={ink} />}
          </>
        );
        return section === null ? (
          <View
            key={fact.kind}
            accessible
            accessibilityLabel={`${label} : ${fact.value}`}
            style={line}
          >
            {content}
          </View>
        ) : (
          <Pressable
            key={fact.kind}
            accessibilityRole="button"
            accessibilityLabel={`${label} : ${fact.value}`}
            accessibilityHint={t("procedures.showDocuments")}
            onPress={() => {
              onShowSection(section);
            }}
            style={({ pressed }) => [line, { opacity: pressed ? opacity.cardPressed : 1 }]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
