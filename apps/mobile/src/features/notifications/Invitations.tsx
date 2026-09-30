import { BellIcon as Bell } from "phosphor-react-native/src/icons/Bell";
import { PermissionInvitation } from "../../components/PermissionInvitation";
import { useTranslation } from "../../i18n/useTranslation";
import { UsageStatsInvitation } from "../usage-stats/UsageStatsInvitation";
import { useNotifications } from "./NotificationsProvider";

/**
 * The invitations of the app, one at a time and one per session: first the
 * notifications of new articles (what the person gains), then, another time, the
 * anonymous statistics (what the team gains).
 */
export function Invitations({ visible }: { visible: boolean }) {
  const notifications = useNotifications();
  const { t } = useTranslation();
  const statsMayShow = !notifications.invitationDue && !notifications.answeredThisSession;
  return (
    <>
      <PermissionInvitation
        visible={visible && notifications.invitationDue}
        icon={Bell}
        title={t("notificationsInvite.title")}
        body={t("notificationsInvite.body")}
        note={t("notificationsInvite.note")}
        accept={t("notificationsInvite.accept")}
        decline={t("notificationsInvite.decline")}
        onAnswer={notifications.answerInvitation}
      />
      <UsageStatsInvitation visible={visible && statsMayShow} />
    </>
  );
}
