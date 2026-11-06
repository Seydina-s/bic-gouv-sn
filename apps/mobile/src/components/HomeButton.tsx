import { useRouter } from "expo-router";
import { HouseIcon as House } from "phosphor-react-native/src/icons/House";
import { useTranslation } from "../i18n/useTranslation";
import { IconButton } from "./IconButton";

/**
 * The way out of a screen opened with nothing under it (a notification touched while
 * the app was closed): back to the front page, where the native back button cannot go.
 */
export function HomeButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <IconButton
      icon={House}
      label={t("tabs.home")}
      onPress={() => {
        router.replace("/");
      }}
    />
  );
}
