import { ChartBarIcon as ChartBar } from "phosphor-react-native/src/icons/ChartBar";
import { PermissionInvitation } from "../../components/PermissionInvitation";
import { useTranslation } from "../../i18n/useTranslation";
import { useUsageStats } from "./UsageStatsProvider";

/**
 * Asks once whether anonymous statistics may be counted (AUD4-03, decision of
 * 29/09/2026: yes turns them on at once). Shown only after a first article read,
 * never during the welcome screens.
 */
export function UsageStatsInvitation({ visible }: { visible: boolean }) {
  const { invitationDue, answerInvitation } = useUsageStats();
  const { t } = useTranslation();
  return (
    <PermissionInvitation
      visible={visible && invitationDue}
      icon={ChartBar}
      title={t("usageInvite.title")}
      body={t("usageInvite.body")}
      note={t("usageInvite.note")}
      accept={t("usageInvite.accept")}
      decline={t("usageInvite.decline")}
      onAnswer={answerInvitation}
    />
  );
}
