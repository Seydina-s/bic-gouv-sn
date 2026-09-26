import type { ProcedureDetail } from "@bgs/shared-types";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { CheckSquareIcon as CheckSquare } from "phosphor-react-native/src/icons/CheckSquare";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { BlockRenderer } from "../news/BlockRenderer";
import { FactCards, useProcedureFacts } from "./ProcedureFacts";

const SOURCE = "e-senegal.sn";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return (
    <View style={{ marginBottom: space.xl }}>
      <Text
        accessibilityRole="header"
        style={[textStyle.title, { color: color.textPrimary, marginBottom: space.md }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Documents to bring, as a checklist (Service-Public.fr): easy to go through at home. */
function DocumentList({ documents }: { documents: string[] }) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return documents.map((document) => (
    <View key={document} style={[styles.line, { gap: space.sm, marginBottom: space.sm }]}>
      <Icon icon={CheckSquare} size="sm" color={color.textBrand} />
      <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>{document}</Text>
    </View>
  ));
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={[styles.line, { minHeight: theme.touchTarget.min, gap: space.sm }]}
    >
      <Text style={[textStyle.label, styles.flex, { color: color.textBrand }]}>{label}</Text>
    </Pressable>
  );
}

export interface ProcedureViewProps {
  detail: ProcedureDetail | undefined;
  isPending: boolean;
  bottomInset: number;
  onOpenRelated: (slug: string) => void;
}

/**
 * One procedure, explained: key facts first, then who, what to bring, how, and the
 * official page where it is actually done. Only what e-senegal.sn publishes.
 */
export function ProcedureView({
  detail,
  isPending,
  bottomInset,
  onOpenRelated,
}: ProcedureViewProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, layout, radius } = theme;

  if (detail === undefined) {
    return (
      <View style={[styles.center, { padding: space.xl }]}>
        {isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("procedures.notFound")}
          </Text>
        )}
      </View>
    );
  }

  const open = (url: string) => () => void Linking.openURL(url);
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingBottom: bottomInset + space.xxxl,
        alignSelf: "center",
        width: "100%",
        maxWidth: layout.readingMaxWidth,
      }}
    >
      <Text
        accessibilityRole="header"
        style={[textStyle.leadHeadline, { color: color.textPrimary, marginTop: space.md }]}
      >
        {detail.title}
      </Text>
      {detail.summary !== null && (
        <Text style={[textStyle.body, { color: color.textSecondary, marginTop: space.sm }]}>
          {detail.summary}
        </Text>
      )}
      {detail.translationStatus === "machine" && (
        <Text style={[textStyle.bodySmall, { color: color.textTertiary, marginTop: space.xs }]}>
          {t("content.machineTranslation")}
        </Text>
      )}
      <View style={{ height: space.xl }} />
      <ProcedureFactCards detail={detail} />
      {detail.eligibility !== null && (
        <Section title={t("procedures.eligibility")}>
          <Text style={[textStyle.body, { color: color.textPrimary }]}>{detail.eligibility}</Text>
        </Section>
      )}
      {detail.documents.length > 0 && (
        <Section title={t("procedures.documents")}>
          <DocumentList documents={detail.documents} />
        </Section>
      )}
      {detail.blocks.length > 0 && (
        <Section title={t("procedures.steps")}>
          <BlockRenderer blocks={detail.blocks} />
        </Section>
      )}
      {detail.offices.length > 0 && (
        <Section title={t("procedures.offices")}>
          {detail.offices.map((office) => (
            <View key={office.name} style={{ marginBottom: space.md }}>
              <Text style={[textStyle.label, { color: color.textPrimary }]}>{office.name}</Text>
              {[office.address, office.town, office.region, office.phone, office.email]
                .filter((part): part is string => part !== null)
                .map((part) => (
                  <Text key={part} style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                    {part}
                  </Text>
                ))}
            </View>
          ))}
        </Section>
      )}
      {detail.faqs.length > 0 && (
        <Section title={t("procedures.faqs")}>
          {detail.faqs.map((faq) => (
            <View key={faq.question}>
              <Text
                style={[textStyle.subtitle, { color: color.textPrimary, marginBottom: space.sm }]}
              >
                {faq.question}
              </Text>
              <BlockRenderer blocks={faq.blocks} />
            </View>
          ))}
        </Section>
      )}
      {detail.legalTexts.length > 0 && (
        <Section title={t("procedures.legalTexts")}>
          {detail.legalTexts.map((text) => (
            <View key={text.name} style={{ marginBottom: space.sm }}>
              <Text style={[textStyle.label, { color: color.textPrimary }]}>{text.name}</Text>
              {text.description !== null && (
                <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
                  {text.description}
                </Text>
              )}
            </View>
          ))}
        </Section>
      )}
      {detail.usefulLinks.length > 0 && (
        <Section title={t("procedures.usefulLinks")}>
          {detail.usefulLinks.map((link) => (
            <LinkRow key={link.url} label={link.name} onPress={open(link.url)} />
          ))}
        </Section>
      )}
      {detail.related.length > 0 && (
        <Section title={t("procedures.related")}>
          {detail.related.map((related) => (
            <LinkRow
              key={related.slug}
              label={related.title}
              onPress={() => {
                onOpenRelated(related.slug);
              }}
            />
          ))}
        </Section>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={open(detail.sourceUrl)}
        style={({ pressed }) => [
          styles.primary,
          {
            backgroundColor: pressed ? color.primaryPressed : color.primary,
            borderRadius: radius.md,
            minHeight: theme.touchTarget.min,
            paddingHorizontal: space.xl,
            paddingVertical: space.md,
            gap: space.sm,
          },
        ]}
      >
        <Text style={[textStyle.label, styles.buttonText, { color: color.onPrimary }]}>
          {t("procedures.goOfficial")}
        </Text>
        <Icon icon={ArrowSquareOut} size="sm" color={color.onPrimary} />
      </Pressable>
      <Text style={[textStyle.bodySmall, { color: color.textSecondary, marginTop: space.lg }]}>
        {t("content.sourceAttribution", { source: SOURCE })}
      </Text>
    </ScrollView>
  );
}

function ProcedureFactCards({ detail }: { detail: ProcedureDetail }) {
  return <FactCards facts={useProcedureFacts(detail)} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  line: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  buttonText: { flexShrink: 1, textAlign: "center" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
