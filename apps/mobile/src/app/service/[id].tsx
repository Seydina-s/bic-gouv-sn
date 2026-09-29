import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ServiceDetail } from "../../features/near-me/ServiceDetail";
import { useStateServices } from "../../features/near-me/useStateServices";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** One state service on its own screen. */
export default function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const services = useStateServices();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle } = theme;
  const service = services.data?.services.find((item) => item.id === id);

  const screen = (
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
  );

  if (service === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: color.background, padding: space.xl }]}>
        {screen}
        {services.isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("nearMe.notFound")}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: color.background }]}>
      {screen}
      <ServiceDetail service={service} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
