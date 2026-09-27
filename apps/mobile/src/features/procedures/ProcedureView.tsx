import type { ProcedureDetail, ServiceCategory } from "@bgs/shared-types";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import * as Speech from "expo-speech";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { Runs } from "../news/BlockRenderer";
import { FRENCH_VOICE, ReadAloudButton } from "../news/ListenButton";
import { FloatingAppBar } from "../shell/FloatingAppBar";
import { ProcedureActionBar } from "./ProcedureActionBar";
import { ProcedureBrief, useBriefLabels } from "./ProcedureBrief";
import { ProcedureExtras } from "./ProcedureExtras";
import { useFeeWording } from "./ProcedureFacts";
import { procedurePage, type PageWords } from "./procedure-page";
import { whereToGo, type LinkedKind } from "./service-link";
import { SheetItems, SheetSectionView } from "./SheetContent";
import { spokenProcedure } from "./spoken-procedure";
import { useDocumentChecklist } from "./useDocumentChecklist";

const SOURCE = "e-senegal.sn";

function usePageWords(): PageWords {
  const { t } = useTranslation();
  const fee = useFeeWording();
  return useMemo(
    () => ({
      eligibility: t("procedures.eligibility"),
      documents: t("procedures.documents"),
      fee,
      delay: (days: number) => t("procedures.delayDays", { count: days }),
      pieces: (count: number) => t("procedures.documentsCount", { count }),
      online: t("procedures.onlinePossible"),
    }),
    [t, fee],
  );
}

export interface ProcedureViewProps {
  detail: ProcedureDetail | undefined;
  isPending: boolean;
  bottomInset: number;
  onOpenRelated: (slug: string) => void;
  /** Kinds of state services with at least one verified entry, and how to show them. */
  services?:
    { kinds: ReadonlySet<ServiceCategory>; onOpen: (kind: LinkedKind) => void } | undefined;
}

/**
 * One procedure, in the app's own layout: the answers people look for first ("En
 * bref"), then each question of the official sheet with its icon, the documents
 * to tick off, the steps in order, and the official page one tap away at all times.
 * Only what e-senegal.sn publishes, in its own words.
 */
export function ProcedureView({
  detail,
  isPending,
  bottomInset,
  onOpenRelated,
  services,
}: ProcedureViewProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;

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
  return (
    <ProcedureSheetView
      key={detail.slug}
      detail={detail}
      bottomInset={bottomInset}
      onOpenRelated={onOpenRelated}
      services={services}
    />
  );
}

function ProcedureSheetView({
  detail,
  bottomInset,
  onOpenRelated,
  services,
}: {
  detail: ProcedureDetail;
  bottomInset: number;
  onOpenRelated: ProcedureViewProps["onOpenRelated"];
  services: ProcedureViewProps["services"];
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const words = usePageWords();
  const labels = useBriefLabels();
  const page = useMemo(() => procedurePage(detail, words), [detail, words]);
  // Only offered when it leads somewhere: a verified service of that kind exists.
  const goTo = whereToGo(page);
  const nearest = goTo !== null && services?.kinds.has(goTo) === true ? goTo : null;
  const checklist = useDocumentChecklist(detail.slug);
  const scroller = useRef<ScrollView>(null);
  // Where each section starts in the page, to lead the reader there.
  const offsets = useRef(new Map<number, number>());
  const scrollTop = useScrollTop();
  const [barHeight, setBarHeight] = useState(0);
  const { color, space, textStyle, layout, touchTarget } = theme;
  // The floating app bar covers the top of the page once scrolled.
  const coveredTop = touchTarget.min + layout.flagStripe + space.md;

  const scrollTo = (y: number) => {
    scroller.current?.scrollTo({ y: Math.max(0, y), animated: true });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        onScroll={scrollTop.onScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: barHeight + space.xxl,
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
        {page.lead !== null && (
          <Text style={[textStyle.body, { color: color.textSecondary, marginTop: space.sm }]}>
            <Runs inlines={page.lead} />
          </Text>
        )}
        {detail.translationStatus === "machine" && (
          <Text style={[textStyle.bodySmall, { color: color.textTertiary, marginTop: space.xs }]}>
            {t("content.machineTranslation")}
          </Text>
        )}
        <View style={[styles.listen, { marginTop: space.lg }]}>
          <ReadAloudButton
            language={FRENCH_VOICE}
            pieces={() =>
              spokenProcedure(
                detail.title,
                page,
                {
                  brief: t("procedures.brief"),
                  fact: (fact) => `${labels[fact.kind]} : ${fact.value}`,
                  note: t("procedures.note"),
                },
                Speech.maxSpeechInputLength,
              )
            }
          />
        </View>
        {page.facts.length > 0 && (
          <View style={{ marginTop: space.xl }}>
            <ProcedureBrief
              facts={page.facts}
              onShowSection={(section) => {
                scrollTo((offsets.current.get(section) ?? 0) - coveredTop);
              }}
            />
          </View>
        )}
        {nearest !== null && services !== undefined && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              services.onOpen(nearest);
            }}
            style={({ pressed }) => [
              styles.nearest,
              {
                marginTop: space.md,
                gap: space.md,
                minHeight: touchTarget.min,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderRadius: theme.radius.lg,
                borderColor: color.border,
                backgroundColor: pressed ? color.surface : color.background,
              },
            ]}
          >
            <Icon icon={MapPin} weight="duotone" color={color.textBrand} />
            <Text style={[textStyle.label, styles.grow, { color: color.textBrand }]}>
              {t(`procedures.nearest.${nearest}`)}
            </Text>
            <Icon icon={CaretRight} size="sm" color={color.textBrand} />
          </Pressable>
        )}
        {page.intro.length > 0 && (
          <View style={{ marginTop: space.xl }}>
            <SheetItems items={page.intro} kind={null} />
          </View>
        )}
        {page.sections.map((section, index) => (
          <SheetSectionView
            key={`${section.kind}-${String(index)}`}
            section={section}
            checklist={checklist}
            onLayout={(event) => {
              offsets.current.set(index, event.nativeEvent.layout.y);
            }}
          />
        ))}
        <ProcedureExtras detail={detail} onOpenRelated={onOpenRelated} />
        <Text
          style={[
            textStyle.bodySmall,
            styles.source,
            {
              color: color.textTertiary,
              borderTopColor: color.border,
              marginTop: space.xxl,
              paddingTop: space.lg,
            },
          ]}
        >
          {t("content.sourceAttribution", { source: SOURCE })}
        </Text>
      </ScrollView>
      <ScrollTopButton
        visible={scrollTop.visible}
        bottom={barHeight + space.md}
        onPress={() => {
          scrollTo(0);
        }}
      />
      <FloatingAppBar visible={scrollTop.visible} />
      <ProcedureActionBar
        url={detail.sourceUrl}
        bottomInset={bottomInset}
        onLayout={(event) => {
          setBarHeight(event.nativeEvent.layout.height);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listen: { alignSelf: "flex-start" },
  nearest: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  grow: { flex: 1 },
  source: { borderTopWidth: StyleSheet.hairlineWidth },
});
