import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * The procedure's one action, always within reach (Airbnb's booking bar): doing it
 * on e-senegal.sn. A glass bar over the sheet, above the system gesture area.
 */
export function ProcedureActionBar({
  url,
  bottomInset,
  onLayout,
}: {
  url: string;
  bottomInset: number;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          paddingTop: space.md,
          paddingBottom: bottomInset + space.md,
          paddingHorizontal: space.lg,
          borderTopColor: color.glassBorder,
        },
      ]}
    >
      <GlassBackdrop />
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(url)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? color.primaryPressed : color.primary,
            borderRadius: radius.md,
            minHeight: touchTarget.min,
            maxWidth: layout.readingMaxWidth,
            paddingHorizontal: space.xl,
            paddingVertical: space.md,
            gap: space.sm,
          },
        ]}
      >
        <Text style={[textStyle.label, styles.label, { color: color.onPrimary }]}>
          {t("procedures.goOfficial")}
        </Text>
        <Icon icon={ArrowSquareOut} size="sm" color={color.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flexShrink: 1, textAlign: "center" },
});
