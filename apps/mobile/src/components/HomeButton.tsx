import { useRouter } from "expo-router";
import { ArrowLeftIcon as ArrowLeft } from "phosphor-react-native/src/icons/ArrowLeft";
import { CaretLeftIcon as CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
import { Platform } from "react-native";
import { useTranslation } from "../i18n/useTranslation";
import { IconButton } from "./IconButton";

/**
 * The way out of a screen opened with nothing under it (a notification touched while
 * the app was closed): back to the front page, where the native back button cannot go.
 * It wears each system's own back arrow, so it reads as one (owner, 06/11/2026).
 */
export function HomeButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <IconButton
      icon={Platform.OS === "ios" ? CaretLeft : ArrowLeft}
      label={t("tabs.home")}
      onPress={() => {
        router.replace("/");
      }}
    />
  );
}
