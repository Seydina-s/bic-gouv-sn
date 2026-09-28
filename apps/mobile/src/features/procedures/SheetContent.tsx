import type { Inline } from "@bgs/shared-types";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { AddressBookIcon as AddressBook } from "phosphor-react-native/src/icons/AddressBook";
import { CalendarBlankIcon as CalendarBlank } from "phosphor-react-native/src/icons/CalendarBlank";
import { CalendarCheckIcon as CalendarCheck } from "phosphor-react-native/src/icons/CalendarCheck";
import { CertificateIcon as Certificate } from "phosphor-react-native/src/icons/Certificate";
import { CheckSquareIcon as CheckSquare } from "phosphor-react-native/src/icons/CheckSquare";
import { ClipboardTextIcon as ClipboardText } from "phosphor-react-native/src/icons/ClipboardText";
import { CoinsIcon as Coins } from "phosphor-react-native/src/icons/Coins";
import { FilesIcon as Files } from "phosphor-react-native/src/icons/Files";
import { HourglassIcon as Hourglass } from "phosphor-react-native/src/icons/Hourglass";
import { InfoIcon as Info } from "phosphor-react-native/src/icons/Info";
import { LifebuoyIcon as Lifebuoy } from "phosphor-react-native/src/icons/Lifebuoy";
import { ListNumbersIcon as ListNumbers } from "phosphor-react-native/src/icons/ListNumbers";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { QuestionIcon as Question } from "phosphor-react-native/src/icons/Question";
import { ScalesIcon as Scales } from "phosphor-react-native/src/icons/Scales";
import { SquareIcon as Square } from "phosphor-react-native/src/icons/Square";
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import type { ComponentType, ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { BlockRenderer, Runs } from "../news/BlockRenderer";
import type { SectionKind, SheetItem, SheetSection } from "./procedure-sheet";
import type { DocumentChecklist } from "./useDocumentChecklist";

type Glyph = ComponentType<PhosphorProps>;

/** One icon per kind of section: what the question is about, at a glance. */
export const SECTION_ICONS: Record<SectionKind, Glyph> = {
  who: UsersThree,
  when: CalendarBlank,
  documents: Files,
  cost: Coins,
  time: Hourglass,
  validity: CalendarCheck,
  where: MapPin,
  how: ListNumbers,
  problem: Lifebuoy,
  result: Certificate,
  duty: ClipboardText,
  legal: Scales,
  more: AddressBook,
  info: Question,
};

/** Round badge holding a section's icon. */
const BADGE_SIZE = 40;
/** List bullet and numbered step marker, at the default text size. */
const BULLET_SIZE = 6;
const STEP_SIZE = 28;
const STEP_RAIL_WIDTH = 2;

function plain(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** A section's heading: its icon in a round badge, the source's question beside it. */
export function SectionHeading({
  icon,
  title,
  children,
}: {
  icon: Glyph;
  title: string;
  children?: ReactNode;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius } = theme;
  return (
    <View style={[styles.row, styles.centered, { gap: space.md }]}>
      <View
        style={[
          styles.badge,
          {
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: radius.full,
            backgroundColor: color.surface,
          },
        ]}
      >
        <Icon icon={icon} weight="duotone" color={color.textBrand} />
      </View>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[textStyle.subtitle, { color: color.textPrimary }]}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Paragraph({ inlines }: { inlines: Inline[] }) {
  const { theme } = useTheme();
  return (
    <Text style={[theme.textStyle.body, { color: theme.color.textPrimary }]}>
      <Runs inlines={inlines} />
    </Text>
  );
}

/** The source's "NB" remarks: a soft yellow notice, never an alarm. */
function Note({ inlines }: { inlines: Inline[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius } = theme;
  return (
    <View
      accessible
      accessibilityLabel={`${t("procedures.note")} : ${plain(inlines)}`}
      style={[
        styles.row,
        {
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: color.accentContainer,
        },
      ]}
    >
      <Icon icon={Info} weight="duotone" color={color.onAccentContainer} />
      <Text style={[textStyle.body, styles.flex, { color: color.onAccentContainer }]}>
        <Runs inlines={inlines} />
      </Text>
    </View>
  );
}

function Bullets({ entries }: { entries: Inline[][] }) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { color, space, textStyle } = theme;
  // Centred on the first line, whatever the system text size.
  const offset = (textStyle.body.lineHeight * fontScale - BULLET_SIZE) / 2;
  return (
    <View style={{ gap: space.sm }}>
      {entries.map((entry, index) => (
        // Entries never reorder: the index is a stable key here.
        <View key={index} style={[styles.row, { gap: space.md }]}>
          <View
            style={{
              width: BULLET_SIZE,
              height: BULLET_SIZE,
              borderRadius: theme.radius.full,
              backgroundColor: color.textBrand,
              marginTop: offset,
            }}
          />
          <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>
            <Runs inlines={entry} />
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Steps in order (GOV.UK step by step): numbered, joined by a thin rail. */
function Steps({ entries }: { entries: Inline[][] }) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { color, space, textStyle, radius } = theme;
  const size = STEP_SIZE * Math.max(1, fontScale);
  const lineHeight = textStyle.body.lineHeight * fontScale;
  return (
    <View>
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <View key={index} style={styles.row}>
            <View style={[styles.rail, { width: size, marginRight: space.md }]}>
              <View
                style={[
                  styles.badge,
                  {
                    width: size,
                    height: size,
                    borderRadius: radius.full,
                    backgroundColor: color.primary,
                  },
                ]}
              >
                <Text style={[textStyle.label, { color: color.onPrimary }]}>{index + 1}</Text>
              </View>
              {!last && (
                <View
                  style={[
                    styles.flex,
                    {
                      width: STEP_RAIL_WIDTH,
                      marginVertical: space.xs,
                      backgroundColor: color.border,
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                textStyle.body,
                styles.flex,
                {
                  color: color.textPrimary,
                  paddingTop: Math.max(0, (size - lineHeight) / 2),
                  paddingBottom: last ? 0 : space.lg,
                },
              ]}
            >
              <Runs inlines={entry} />
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Documents to bring, to tick off at home (Service-Public.fr): kept on the phone. */
function Checklist({ entries, checklist }: { entries: Inline[][]; checklist: DocumentChecklist }) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  return (
    <View>
      {entries.map((entry, index) => {
        const label = plain(entry);
        const checked = checklist.ticked.has(label);
        return (
          <Pressable
            key={index}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            // The web export ignores accessibilityState: without it a checkbox has no state.
            aria-checked={checked}
            accessibilityLabel={label}
            onPress={() => {
              checklist.toggle(label);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                gap: space.md,
                minHeight: touchTarget.min,
                paddingVertical: space.sm,
                paddingHorizontal: space.xs,
                marginHorizontal: -space.xs,
                borderRadius: radius.sm,
                backgroundColor: pressed ? color.surface : undefined,
              },
            ]}
          >
            <Icon
              icon={checked ? CheckSquare : Square}
              weight={checked ? "fill" : "regular"}
              color={checked ? color.primary : color.borderStrong}
            />
            <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>
              <Runs inlines={entry} />
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The content of a section, laid out by kind: documents to tick, steps numbered,
 * other lists bulleted, remarks in a notice.
 */
export function SheetItems({
  items,
  kind,
  checklist,
}: {
  items: SheetItem[];
  kind: SectionKind | null;
  checklist?: DocumentChecklist;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.space.md }}>
      {items.map((item, index) => {
        const key = `${item.type}-${String(index)}`;
        switch (item.type) {
          case "text":
            return <Paragraph key={key} inlines={item.inlines} />;
          case "note":
            return <Note key={key} inlines={item.inlines} />;
          case "block":
            return <BlockRenderer key={key} blocks={[item.block]} />;
          case "list":
            if (kind === "documents" && checklist !== undefined) {
              return <Checklist key={key} entries={item.items} checklist={checklist} />;
            }
            return item.ordered || (kind === "how" && item.items.length > 1) ? (
              <Steps key={key} entries={item.items} />
            ) : (
              <Bullets key={key} entries={item.items} />
            );
        }
      })}
    </View>
  );
}

/** The documents a section asks for, as the checklist names them. */
function documentsOf(section: SheetSection): string[] {
  return section.kind === "documents"
    ? section.items.flatMap((item) => (item.type === "list" ? item.items.map(plain) : []))
    : [];
}

/** One section of the sheet: heading, then content; documents show how many are ticked. */
export function SheetSectionView({
  section,
  checklist,
  onLayout,
}: {
  section: SheetSection;
  checklist: DocumentChecklist;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  const documents = documentsOf(section);
  const done = documents.filter((entry) => checklist.ticked.has(entry)).length;
  return (
    <View onLayout={onLayout} style={{ marginTop: space.xxl, gap: space.lg }}>
      <SectionHeading icon={SECTION_ICONS[section.kind]} title={section.title}>
        {documents.length > 0 && (
          <Text
            accessibilityLiveRegion="polite"
            style={[textStyle.bodySmall, { color: color.textSecondary, marginTop: space.xxs }]}
          >
            {done > 0
              ? t("procedures.checklistDone", { count: done, total: documents.length })
              : t("procedures.checklistHint")}
          </Text>
        )}
      </SectionHeading>
      <SheetItems items={section.items} kind={section.kind} checklist={checklist} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  centered: { alignItems: "center" },
  badge: { alignItems: "center", justifyContent: "center" },
  rail: { alignItems: "center" },
  flex: { flex: 1 },
});
