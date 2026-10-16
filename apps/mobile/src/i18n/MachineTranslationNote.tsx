import { Text } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useTranslation } from "./useTranslation";

/**
 * Said wherever the language is chosen while the interface is in Wolof: its words
 * are a machine translation until native speakers review them (owner's decision of
 * 16/10/2026, W-01). Nothing is shown in the other languages.
 */
export function MachineTranslationNote() {
  const { theme } = useTheme();
  const { t, interfaceLang } = useTranslation();
  if (interfaceLang !== "wo") {
    return null;
  }
  return (
    <Text style={[theme.textStyle.bodySmall, { color: theme.color.textSecondary }]}>
      {t("settings.languageWoMachine")}
    </Text>
  );
}
