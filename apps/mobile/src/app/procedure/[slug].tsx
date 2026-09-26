import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProcedureView } from "../../features/procedures/ProcedureView";
import { useProcedure } from "../../features/procedures/useProcedures";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** One procedure on its own screen, linked to its official page on e-senegal.sn. */
export default function ProcedureScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const procedure = useProcedure(slug);
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
      <ProcedureView
        detail={procedure.data}
        isPending={procedure.isPending}
        bottomInset={insets.bottom}
        onOpenRelated={(related) => {
          router.push({ pathname: "/procedure/[slug]", params: { slug: related } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
