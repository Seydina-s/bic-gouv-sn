import type { Inline } from "@bgs/shared-types";
import type { IconProps as PhosphorProps } from "phosphor-react-native";
import { AddressBookIcon as AddressBook } from "phosphor-react-native/src/icons/AddressBook";
import { CalendarBlankIcon as CalendarBlank } from "phosphor-react-native/src/icons/CalendarBlank";
import { CalendarCheckIcon as CalendarCheck } from "phosphor-react-native/src/icons/CalendarCheck";
import { CertificateIcon as Certificate } from "phosphor-react-native/src/icons/Certificate";
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
import { UsersThreeIcon as UsersThree } from "phosphor-react-native/src/icons/UsersThree";
import type { ComponentType } from "react";
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { BlockRenderer, Runs } from "../news/BlockRenderer";
import type { SectionKind, SheetItem, SheetSection } from "./procedure-sheet";

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
/** The thin line joining numbered steps, and the sections of the path. */
const RAIL_WIDTH = 2;

function plain(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** A section's icon in a round badge. */
function SectionBadge({ icon }: { icon: Glyph }) {
  const { theme } = useTheme();
  const { color, radius } = theme;
  return (
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
  );
}

/** A section's heading: its icon in a round badge, the title beside it. */
export function SectionHeading({ icon, title }: { icon: Glyph; title: string }) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return (
    <View style={[styles.row, styles.centered, { gap: space.md }]}>
      <SectionBadge icon={icon} />
      <Text
        accessibilityRole="header"
        style={[textStyle.subtitle, styles.flex, { color: color.textPrimary }]}
      >
        {title}
      </Text>
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
                      width: RAIL_WIDTH,
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

/**
 * The content of a section, laid out by kind: steps numbered, other lists
 * bulleted, remarks in a notice.
 */
export function SheetItems({ items, kind }: { items: SheetItem[]; kind: SectionKind | null }) {
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

/**
 * One section of the sheet as a stop on the path: its icon on a thin rail that
 * leads to the next section, the source's question and content beside it.
 * The sections keep the source's order; nothing is added between them.
 */
export function SheetSectionView({
  section,
  first,
  last,
  onLayout,
}: {
  section: SheetSection;
  first: boolean;
  last: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { color, space, textStyle } = theme;
  // The question sits level with its badge, whatever the system text size.
  const titleOffset = Math.max(0, (BADGE_SIZE - textStyle.subtitle.lineHeight * fontScale) / 2);
  return (
    <View onLayout={onLayout} style={[styles.row, { marginTop: first ? space.xxl : 0 }]}>
      <View style={[styles.rail, { width: BADGE_SIZE, marginRight: space.md }]}>
        <SectionBadge icon={SECTION_ICONS[section.kind]} />
        {!last && (
          <View
            style={[
              styles.flex,
              { width: RAIL_WIDTH, marginVertical: space.xs, backgroundColor: color.border },
            ]}
          />
        )}
      </View>
      <View style={[styles.flex, { gap: space.lg, paddingBottom: last ? 0 : space.xxl }]}>
        <Text
          accessibilityRole="header"
          style={[textStyle.subtitle, { color: color.textPrimary, paddingTop: titleOffset }]}
        >
          {section.title}
        </Text>
        <SheetItems items={section.items} kind={section.kind} />
      </View>
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
