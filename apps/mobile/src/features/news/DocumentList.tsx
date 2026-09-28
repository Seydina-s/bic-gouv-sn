import type { NewsDocument } from "@bgs/shared-types";
import { FilePdfIcon as FilePdf } from "phosphor-react-native/src/icons/FilePdf";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

/** "PDF · 2,3 Mo": the size first, so people on a slow network decide before opening. */
export function useDocumentSize() {
  const { t } = useTranslation();
  // Numbers read the French way in both languages, like dates (W-01).
  const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  return (bytes: number) =>
    bytes < MEGABYTE
      ? t("article.documentSizeKb", { size: number.format(Math.max(1, bytes / KILOBYTE)) })
      : t("article.documentSizeMb", { size: number.format(bytes / MEGABYTE) });
}

/** Official PDFs of an article, opened from our copy (still there if the source moves them). */
export function DocumentList({ documents }: { documents: readonly NewsDocument[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const sizeOf = useDocumentSize();
  const { color, space, textStyle, radius } = theme;
  if (documents.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: space.sm, marginBottom: space.lg }}>
      <Text accessibilityRole="header" style={[textStyle.subtitle, { color: color.textPrimary }]}>
        {t("article.documents")}
      </Text>
      {documents.map((document) => {
        const title = document.title ?? t("article.document");
        const size = sizeOf(document.bytes);
        return (
          <Pressable
            key={document.url}
            accessibilityRole="link"
            accessibilityLabel={`${title}. ${size}`}
            onPress={() => void Linking.openURL(document.url)}
            style={({ pressed }) => [
              styles.row,
              {
                gap: space.md,
                padding: space.md,
                minHeight: theme.touchTarget.min,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: color.border,
                backgroundColor: pressed ? color.surface : color.background,
              },
            ]}
          >
            <Icon icon={FilePdf} size="lg" weight="duotone" color={color.textBrand} />
            <View style={styles.flex}>
              <Text style={[textStyle.label, { color: color.textPrimary }]}>{title}</Text>
              <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{size}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
