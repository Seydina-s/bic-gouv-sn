import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStateServices } from "../../features/near-me/useStateServices";
import { ProcedureView } from "../../features/procedures/ProcedureView";
import { useProcedure } from "../../features/procedures/useProcedures";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * One procedure on its own screen, linked to its official page on e-senegal.sn and,
 * when the sheet says where to go, to the nearest verified service of that kind.
 */
function Procedure() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const procedure = useProcedure(slug);
  const services = useStateServices();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color } = theme;
  const kinds = useMemo(
    () => new Set((services.data?.services ?? []).map((service) => service.category)),
    [services.data],
  );

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
        services={{
          kinds,
          onOpen: (kind) => {
            router.navigate({ pathname: "/near-me", params: { category: kind } });
          },
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
