import { useRouter } from "expo-router";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { GearSixIcon as GearSix } from "phosphor-react-native/src/icons/GearSix";
import { MagnifyingGlassIcon as MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { IconButton } from "../../components/IconButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useSettings } from "./SettingsProvider";

/** Search, favorites and settings: the same three actions in every top bar. */
export function AppActions() {
  const { t } = useTranslation();
  const router = useRouter();
  const { openSettings } = useSettings();
  return (
    <>
      <IconButton
        icon={MagnifyingGlass}
        label={t("search.title")}
        onPress={() => {
          router.push("/search");
        }}
      />
      <IconButton
        icon={BookmarkSimple}
        label={t("favorites.title")}
        onPress={() => {
          router.push("/favorites");
        }}
      />
      <IconButton icon={GearSix} label={t("settings.title")} onPress={openSettings} />
    </>
  );
}
