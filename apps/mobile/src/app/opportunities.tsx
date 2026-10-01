import { OPPORTUNITY_KINDS, type OpportunityKind } from "@bgs/shared-types";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionChip } from "../features/news/SectionChip";
import { OpportunityCard } from "../features/opportunities/OpportunityCard";
import { useOpportunities } from "../features/opportunities/useOpportunities";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/** Every open opportunity, closing soonest first, filtered by kind if wished. */
export default function OpportunitiesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError } = useOpportunities();
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const { color, space, textStyle, layout } = theme;
  const all = data?.opportunities ?? [];
  // Only the kinds there are something for.
  const kinds = OPPORTUNITY_KINDS.filter((one) => all.some((item) => item.kind === one));
  const shown = kind === null ? all : all.filter((item) => item.kind === kind);

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.md,
          width: "100%",
          maxWidth: layout.readingMaxWidth,
          alignSelf: "center",
        }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Text
              accessibilityRole="header"
              style={[textStyle.headline, { color: color.textPrimary }]}
            >
              {t("opportunities.title")}
            </Text>
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("opportunities.intro")}
            </Text>
            {kinds.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chips, { gap: space.sm }]}>
                  <SectionChip
                    category={null}
                    label={t("opportunities.all")}
                    active={kind === null}
                    onPress={() => {
                      setKind(null);
                    }}
                  />
                  {kinds.map((one) => (
                    <SectionChip
                      key={one}
                      category={null}
                      label={t(`opportunities.kinds.${one}`)}
                      active={kind === one}
                      onPress={() => {
                        setKind(one);
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? null : (
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t(isError && data === undefined ? "opportunities.error" : "opportunities.empty")}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <OpportunityCard
            item={item}
            onPress={(id) => {
              router.push({ pathname: "/opportunity/[id]", params: { id } });
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chips: { flexDirection: "row" },
});
