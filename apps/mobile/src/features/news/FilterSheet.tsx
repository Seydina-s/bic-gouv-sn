import { tracking } from "@bgs/ui";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey, SECTION_FILTERS } from "./category";
import { activeCount, filterParams, NO_FILTERS, PERIODS, type NewsFilters } from "./filters";
import { orderInstitutions } from "./institution";
import { useFilteredCount, usePublishers } from "./useNews";

/** Institutions shown before "+ N autres" (the chosen ones always show). */
const FIRST_INSTITUTIONS = 5;

/** A choice as a pill: green outline and tint when chosen. */
function Pill({
  label,
  selected,
  onPress,
  radio = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  radio?: boolean;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={radio ? { selected } : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          minHeight: touchTarget.min - space.sm,
          paddingHorizontal: space.md,
          borderRadius: radius.full,
          borderColor: selected ? color.primary : color.border,
          backgroundColor: selected ? color.primaryContainer : color.surfaceRaised,
          opacity: pressed ? theme.opacity.controlPressed : 1,
        },
      ]}
    >
      <Text
        style={[
          textStyle.label,
          { color: selected ? color.onPrimaryContainer : color.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Heading({ text, aside }: { text: string; aside?: string }) {
  const { theme } = useTheme();
  const { color, textStyle } = theme;
  return (
    <View style={styles.headingRow}>
      <Text
        accessibilityRole="header"
        style={[textStyle.caption, styles.heading, { color: color.textSecondary }]}
      >
        {text}
      </Text>
      {aside !== undefined && (
        <Text style={[textStyle.caption, { color: color.textBrand }]}>{aside}</Text>
      )}
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  const { color, textStyle, touchTarget, space } = theme;
  return (
    <View
      style={[
        styles.switchRow,
        { minHeight: touchTarget.min + space.xs, borderTopColor: color.border },
      ]}
    >
      <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: color.borderStrong, true: color.primary }}
        thumbColor={color.surfaceRaised}
      />
    </View>
  );
}

const toggled = <T,>(items: readonly T[], item: T): T[] =>
  items.includes(item) ? items.filter((one) => one !== item) : [...items, item];

/**
 * The "Filtrer" panel (FILT-01, option A chosen by the owner on 15/10/2026): a sheet
 * from the bottom, the choices as pills and switches, and one button that says how
 * many articles match, counted as the choice is made.
 */
export function FilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: NewsFilters;
  onClose: () => void;
  onApply: (filters: NewsFilters) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState(initial);
  const [allInstitutions, setAllInstitutions] = useState(false);
  const publishers = usePublishers();
  const params = filterParams(filters, new Date());
  const count = useFilteredCount(params, visible);
  const { color, space, textStyle, radius, touchTarget } = theme;
  const change = (next: Partial<NewsFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  const institutions = orderInstitutions(publishers.data?.publishers ?? [], t);
  const shownInstitutions = allInstitutions
    ? institutions
    : institutions.filter(
        (item, index) =>
          index < FIRST_INSTITUTIONS || filters.publishers.some((id) => id === item.publisher),
      );
  const hidden = institutions.length - shownInstitutions.length;
  const total = count.data?.total;
  const showLabel =
    total === undefined
      ? t("filters.showLoading")
      : total === 0
        ? t("filters.showNone")
        : t("filters.show", { count: total });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        setFilters(initial);
      }}
    >
      <View style={styles.flex}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("filters.close")}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: color.scrim, opacity: theme.opacity.scrim },
          ]}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: color.surfaceRaised,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: space.sm,
            },
          ]}
        >
          <View
            style={[styles.headingRow, { paddingHorizontal: space.lg, paddingVertical: space.sm }]}
          >
            <Text
              accessibilityRole="header"
              style={[textStyle.title, { color: color.textPrimary }]}
            >
              {t("filters.title")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFilters(NO_FILTERS);
              }}
              disabled={activeCount(filters) === 0}
              style={[styles.clear, { minHeight: touchTarget.min, paddingHorizontal: space.sm }]}
            >
              <Text
                style={[
                  textStyle.label,
                  { color: activeCount(filters) === 0 ? color.textTertiary : color.textBrand },
                ]}
              >
                {t("filters.clear")}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: space.lg,
              gap: space.xl,
              paddingBottom: space.lg,
            }}
          >
            <View style={{ gap: space.sm }}>
              <Heading text={t("filters.sort")} />
              <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: space.sm }]}>
                {(["newest", "oldest"] as const).map((order) => (
                  <Pill
                    key={order}
                    radio
                    label={t(`filters.${order}`)}
                    selected={filters.order === order}
                    onPress={() => {
                      change({ order });
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Heading text={t("filters.period")} />
              <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: space.sm }]}>
                {PERIODS.map((period) => (
                  <Pill
                    key={period}
                    radio
                    label={t(`filters.periods.${period}`)}
                    selected={filters.period === period}
                    onPress={() => {
                      change({ period });
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Heading
                text={t("filters.institutions")}
                {...(filters.publishers.length > 0
                  ? { aside: t("filters.chosen", { count: filters.publishers.length }) }
                  : {})}
              />
              <View style={[styles.wrap, { gap: space.sm }]}>
                {shownInstitutions.map((item) => (
                  <Pill
                    key={item.publisher}
                    label={item.name}
                    selected={filters.publishers.some((id) => id === item.publisher)}
                    onPress={() => {
                      const publisher = filters.publishers.find((id) => id === item.publisher);
                      change({
                        publishers:
                          publisher === undefined
                            ? [
                                ...filters.publishers,
                                item.publisher as NewsFilters["publishers"][number],
                              ]
                            : filters.publishers.filter((id) => id !== publisher),
                      });
                    }}
                  />
                ))}
                {hidden > 0 && (
                  <Pill
                    label={t("filters.more", { count: hidden })}
                    selected={false}
                    onPress={() => {
                      setAllInstitutions(true);
                    }}
                  />
                )}
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Heading text={t("filters.sections")} />
              <View style={[styles.wrap, { gap: space.sm }]}>
                {SECTION_FILTERS.map((category) => (
                  <Pill
                    key={category}
                    label={t(categoryLabelKey(category))}
                    selected={filters.categories.includes(category)}
                    onPress={() => {
                      change({ categories: toggled(filters.categories, category) });
                    }}
                  />
                ))}
              </View>
            </View>

            <View
              style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.border }}
            >
              <SwitchRow
                label={t("filters.wolof")}
                value={filters.wolof}
                onChange={(wolof) => {
                  change({ wolof });
                }}
              />
              <SwitchRow
                label={t("filters.audio")}
                value={filters.audio}
                onChange={(audio) => {
                  change({ audio });
                }}
              />
              <SwitchRow
                label={t("filters.documents")}
                value={filters.documents}
                onChange={(documents) => {
                  change({ documents });
                }}
              />
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: insets.bottom + space.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: color.border,
            }}
          >
            <Pressable
              accessibilityRole="button"
              disabled={total === 0}
              onPress={() => {
                onApply(filters);
              }}
              style={({ pressed }) => [
                styles.apply,
                {
                  minHeight: touchTarget.min + space.xs,
                  borderRadius: radius.lg,
                  backgroundColor:
                    total === 0
                      ? color.borderStrong
                      : pressed
                        ? color.primaryPressed
                        : color.primary,
                },
              ]}
            >
              <Text style={[textStyle.label, { color: color.onPrimary }]}>{showLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%" },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { textTransform: "uppercase", letterSpacing: tracking.caps },
  clear: { justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  pill: { borderWidth: 1, justifyContent: "center" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  apply: { alignItems: "center", justifyContent: "center" },
});
