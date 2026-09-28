import { DownloadSimpleIcon as DownloadSimple } from "phosphor-react-native/src/icons/DownloadSimple";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** Laid over a photo kept back to save data: one tap loads it (MED-03). */
export function ShowPhotoButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, radius, textStyle, touchTarget } = theme;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          {
            minHeight: touchTarget.min,
            gap: space.sm,
            paddingHorizontal: space.lg,
            borderRadius: radius.full,
            borderColor: color.glassBorder,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        <GlassBackdrop />
        <Icon icon={DownloadSimple} size="sm" color={color.textBrand} />
        <Text style={[textStyle.label, { color: color.textPrimary }]}>
          {t("article.showPhoto")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
