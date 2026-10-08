import type { AssistantSource } from "@bgs/shared-types";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { ListChecksIcon as ListChecks } from "phosphor-react-native/src/icons/ListChecks";
import { NewspaperIcon as Newspaper } from "phosphor-react-native/src/icons/Newspaper";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { formatPublishedOn } from "../news/format";

/** Opened in the app when it can be (article, procedure sheet), else at the source. */
export function opensInApp(source: AssistantSource): boolean {
  return source.kind === "news-article" || source.slug !== null;
}

/** One official page the answer comes from: what it is, its title, its date. */
export function SourceRow({
  source,
  onOpen,
}: {
  source: AssistantSource;
  onOpen: (source: AssistantSource) => void;
}) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const { color, space, textStyle, touchTarget, radius } = theme;
  const kind = t(`assistant.sourceKinds.${source.kind}`);
  const date = formatPublishedOn(source.publishedOn, lang);
  return (
    <Pressable
      accessibilityRole={opensInApp(source) ? "button" : "link"}
      accessibilityLabel={t("assistant.sourceSpoken", { kind, title: source.title, date })}
      onPress={() => {
        onOpen(source);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          gap: space.md,
          minHeight: touchTarget.min,
          paddingVertical: space.sm,
          paddingHorizontal: space.sm,
          marginHorizontal: -space.sm,
          borderRadius: radius.md,
          backgroundColor: pressed ? color.primaryContainer : undefined,
        },
      ]}
    >
      <Icon
        icon={source.kind === "procedure" ? ListChecks : Newspaper}
        size="sm"
        color={color.textBrand}
      />
      <View style={[styles.text, { gap: space.xxs }]}>
        <Text style={[textStyle.caption, { color: color.textBrand }]}>
          {date === "" ? kind : `${kind} · ${date}`}
        </Text>
        <Text numberOfLines={3} style={[textStyle.label, { color: color.textPrimary }]}>
          {source.title}
        </Text>
      </View>
      <Icon
        icon={opensInApp(source) ? CaretRight : ArrowSquareOut}
        size="sm"
        color={color.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  text: { flex: 1 },
});
