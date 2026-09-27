import type { ProcedureDetail } from "@bgs/shared-types";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { Runs } from "../news/BlockRenderer";
import { FloatingAppBar } from "../shell/FloatingAppBar";
import { ProcedureActionBar } from "./ProcedureActionBar";
import { ProcedureBrief } from "./ProcedureBrief";
import { ProcedureExtras } from "./ProcedureExtras";
import { useFeeWording } from "./ProcedureFacts";
import { procedurePage, type PageWords } from "./procedure-page";
import { SheetItems, SheetSectionView } from "./SheetContent";
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
    />
  );
}

function ProcedureSheetView({
  detail,
  bottomInset,
  onOpenRelated,
}: {
  detail: ProcedureDetail;
  bottomInset: number;
  onOpenRelated: (slug: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const words = usePageWords();
  const page = useMemo(() => procedurePage(detail, words), [detail, words]);
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
  source: { borderTopWidth: StyleSheet.hairlineWidth },
});
