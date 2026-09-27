import type { ProcedureDetail } from "@bgs/shared-types";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { ChatCircleTextIcon as ChatCircleText } from "phosphor-react-native/src/icons/ChatCircleText";
import { LinkSimpleIcon as LinkSimple } from "phosphor-react-native/src/icons/LinkSimple";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { ScalesIcon as Scales } from "phosphor-react-native/src/icons/Scales";
import { SignpostIcon as Signpost } from "phosphor-react-native/src/icons/Signpost";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import type { ComponentType, ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { BlockRenderer } from "../news/BlockRenderer";
import { SectionHeading } from "./SheetContent";

function Extra({
  icon,
  title,
  children,
}: {
  icon: ComponentType<PhosphorProps>;
  title: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: theme.space.xxl, gap: theme.space.md }}>
      <SectionHeading icon={icon} title={title} />
      <View>{children}</View>
    </View>
  );
}

/** A row leading elsewhere: another procedure, or a page outside the app. */
function LinkRow({
  label,
  role,
  onPress,
}: {
  label: string;
  role: "link" | "button";
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole={role}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.md,
          minHeight: touchTarget.min,
          paddingVertical: space.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: color.border,
          backgroundColor: pressed ? color.surface : undefined,
        },
      ]}
    >
      <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>{label}</Text>
      <Icon
        icon={role === "link" ? ArrowSquareOut : CaretRight}
        size="sm"
        color={color.textBrand}
      />
    </Pressable>
  );
}

/**
 * What e-senegal.sn publishes around the sheet itself: frequent questions, offices,
 * official texts, useful links and related procedures. Each part only when given.
 */
export function ProcedureExtras({
  detail,
  onOpenRelated,
}: {
  detail: ProcedureDetail;
  onOpenRelated: (slug: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  const secondary = [textStyle.bodySmall, { color: color.textSecondary }];

  return (
    <>
      {detail.faqs.length > 0 && (
        <Extra icon={ChatCircleText} title={t("procedures.faqs")}>
          {detail.faqs.map((faq) => (
            <View key={faq.question} style={{ gap: space.sm, marginBottom: space.md }}>
              <Text
                style={[
                  textStyle.body,
                  { color: color.textPrimary, fontFamily: textStyle.subtitle.fontFamily },
                ]}
              >
                {faq.question}
              </Text>
              <BlockRenderer blocks={faq.blocks} />
            </View>
          ))}
        </Extra>
      )}
      {detail.offices.length > 0 && (
        <Extra icon={MapPin} title={t("procedures.offices")}>
          {detail.offices.map((office) => (
            <View key={office.name} style={{ marginBottom: space.md }}>
              <Text style={[textStyle.label, { color: color.textPrimary }]}>{office.name}</Text>
              {[office.address, office.town, office.region, office.phone, office.email]
                .filter((part): part is string => part !== null)
                .map((part) => (
                  <Text key={part} style={secondary}>
                    {part}
                  </Text>
                ))}
            </View>
          ))}
        </Extra>
      )}
      {detail.legalTexts.length > 0 && (
        <Extra icon={Scales} title={t("procedures.legalTexts")}>
          {detail.legalTexts.map((text) => (
            <View
              key={text.name}
              style={{
                paddingVertical: space.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: color.border,
                gap: space.xxs,
              }}
            >
              <Text style={[textStyle.body, { color: color.textPrimary }]}>{text.name}</Text>
              {text.description !== null && <Text style={secondary}>{text.description}</Text>}
            </View>
          ))}
        </Extra>
      )}
      {detail.usefulLinks.length > 0 && (
        <Extra icon={LinkSimple} title={t("procedures.usefulLinks")}>
          {detail.usefulLinks.map((link) => (
            <LinkRow
              key={link.url}
              label={link.name}
              role="link"
              onPress={() => void Linking.openURL(link.url)}
            />
          ))}
        </Extra>
      )}
      {detail.related.length > 0 && (
        <Extra icon={Signpost} title={t("procedures.related")}>
          {detail.related.map((related) => (
            <LinkRow
              key={related.slug}
              label={related.title}
              role="button"
              onPress={() => {
                onOpenRelated(related.slug);
              }}
            />
          ))}
        </Extra>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
