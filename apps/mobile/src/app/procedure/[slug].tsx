import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProcedurePane } from "../../features/procedures/ProcedurePane";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** One procedure on its own screen. */
function Procedure() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color } = theme;

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
      <ProcedurePane
        slug={slug}
        bottomInset={insets.bottom}
        onOpenRelated={(related) => {
          router.push({ pathname: "/procedure/[slug]", params: { slug: related } });
        }}
      />
    </View>
  );
}

/** Behind the "procedures" kill switch: off, it says so plainly. */
export default function ProcedureScreen() {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="procedures" title={t("tabs.procedures")}>
      <Procedure />
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
