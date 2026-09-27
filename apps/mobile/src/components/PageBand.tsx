import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/**
 * "500 articles · Page 2 sur 25": how many items, then the page when there are
 * several. Null until the total is known.
 */
export function usePageMeta(
  countLabel: string | null,
  page: number,
  pages: number | null,
): string | null {
  const { t } = useTranslation();
  if (countLabel === null) {
    return null;
  }
  return pages !== null && pages > 1
    ? `${countLabel} · ${t("section.pageOf", { current: page, total: pages })}`
    : countLabel;
}

export interface PageBandProps {
  /** The list's icon (a section's, a theme's), set in a round badge. */
  icon: ReactNode;
  title: string;
  /** What the list holds and where the reader is: "500 articles · Page 2 sur 25". */
  meta: string | null;
  /** The list's own colours: a section tone, or the brand's soft green. */
  background: string;
  ink: string;
  /** Decoration across the top edge (a section's woven strip). */
  strip?: ReactNode;
}

/**
 * The coloured band opening a paged list (a news section, a procedure theme): its
 * icon, its name, how many items, which page. The screen's top bar stays empty so
 * the name is never said twice.
 */
export function PageBand({ icon, title, meta, background, ink, strip }: PageBandProps) {
  const { theme } = useTheme();
  const { color, space, textStyle, radius, touchTarget } = theme;
  const badge = touchTarget.min + space.lg;
  return (
    <View style={{ backgroundColor: background }}>
      {strip}
      <View
        style={[
          styles.row,
          { paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.lg },
        ]}
      >
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: radius.full,
              backgroundColor: color.background,
            },
          ]}
        >
          {icon}
        </View>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[textStyle.title, { color: ink }]}>
            {title}
          </Text>
          {meta !== null && (
            <Text style={[textStyle.bodySmall, { color: ink, marginTop: space.xxs }]}>{meta}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  badge: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
