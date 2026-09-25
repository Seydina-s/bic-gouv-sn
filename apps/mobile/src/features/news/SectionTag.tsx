import { tracking } from "@bgs/ui";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey } from "./category";
import { WovenSwatch } from "./Selvage";

export interface SectionTagProps {
  category: string;
  /** Marks the story the reader opened last (restored on return). */
  lastOpened?: boolean;
  /** Text color on tinted surfaces (defaults to the brand green). */
  color?: string;
}

/** Section name preceded by its woven chip: the pattern and the words name the section. */
export function SectionTag({ category, lastOpened = false, color }: SectionTagProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { space, textStyle } = theme;
  const tint = color ?? theme.color.textBrand;

  return (
    <View style={[styles.row, { gap: space.sm }]}>
      <WovenSwatch category={category} color={tint} />
      <Text style={[textStyle.caption, styles.caps, { color: tint }]}>
        {t(categoryLabelKey(category))}
      </Text>
      {lastOpened && (
        <Text
          style={[
            textStyle.caption,
            styles.knot,
            {
              color: theme.color.onAccentContainer,
              backgroundColor: theme.color.accentContainer,
              paddingHorizontal: space.sm,
              marginLeft: "auto",
            },
          ]}
        >
          {t("feed.lastOpened")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  caps: { textTransform: "uppercase", letterSpacing: tracking.caps },
  knot: { borderRadius: 999, overflow: "hidden" },
});
