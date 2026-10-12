import { Stack, useRouter } from "expo-router";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { PageBand } from "../components/PageBand";
import { orderInstitutions, type NamedInstitution } from "../features/news/institution";
import { usePublishers } from "../features/news/useNews";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/**
 * Every institution whose news the app carries (Présidence, Primature, ministries),
 * with how many stories each has: one touch opens its news.
 */
export default function InstitutionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const publishers = usePublishers();
  const { color, space, textStyle, layout } = theme;
  const institutions = orderInstitutions(publishers.data?.publishers ?? [], (key) => t(key));

  const open = (publisher: string) => {
    router.push({ pathname: "/institution/[id]", params: { id: publisher } });
  };

  const body = publishers.isPending ? (
    <ActivityIndicator color={color.primary} style={{ marginTop: space.xxl }} />
  ) : institutions.length === 0 ? (
    <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
      {publishers.isError ? t("institutionPages.error") : t("feed.empty")}
    </Text>
  ) : (
    institutions.map((institution) => (
      <InstitutionRow key={institution.publisher} institution={institution} onPress={open} />
    ))
  );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          // The band below names the page: the bar stays empty.
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.column}
        contentContainerStyle={{
          alignSelf: "center",
          width: "100%",
          maxWidth: layout.readingMaxWidth + space.xxxl,
          paddingBottom: insets.bottom + space.lg,
        }}
        testID="institutions-list"
      >
        <PageBand
          icon={
            <Icon icon={Buildings} size="lg" weight="duotone" color={color.onPrimaryContainer} />
          }
          title={t("institutionPages.title")}
          meta={
            institutions.length === 0
              ? null
              : t("institutionPages.institutionCount", { count: institutions.length })
          }
          background={color.primaryContainer}
          ink={color.onPrimaryContainer}
        />
        {body}
      </ScrollView>
    </View>
  );
}

function InstitutionRow({
  institution,
  onPress,
}: {
  institution: NamedInstitution;
  onPress: (publisher: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;
  const count = t("institutionPages.count", { count: institution.total });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${institution.name}. ${count}`}
      onPress={() => {
        onPress(institution.publisher);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? color.surface : color.background,
          borderBottomColor: color.border,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          gap: space.md,
          minHeight: theme.touchTarget.min,
        },
      ]}
    >
      <View style={[styles.text, { gap: space.xs }]}>
        <Text style={[textStyle.storyTitle, { color: color.textPrimary }]}>{institution.name}</Text>
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{count}</Text>
      </View>
      <Icon icon={CaretRight} size="sm" color={color.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { flex: 1, width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});
