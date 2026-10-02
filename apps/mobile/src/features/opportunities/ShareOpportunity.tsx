import type { PublicOpportunity } from "@bgs/shared-types";
import { ShareNetworkIcon as ShareNetwork } from "phosphor-react-native/src/icons/ShareNetwork";
import { Share } from "react-native";
import { IconButton } from "../../components/IconButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useClosingLabel } from "./OpportunityCard";

/**
 * Shares an opportunity as people pass them on by message: what it is, who offers
 * it, until when, and the official page, the only place to apply.
 */
export function ShareOpportunity({ opportunity }: { opportunity: PublicOpportunity }) {
  const { t } = useTranslation();
  const closingLabel = useClosingLabel();
  return (
    <IconButton
      icon={ShareNetwork}
      label={t("opportunities.share")}
      onPress={() =>
        void Share.share({
          title: opportunity.title,
          message: [
            opportunity.title,
            opportunity.organization,
            closingLabel(opportunity.deadline).text,
            opportunity.officialUrl,
          ].join("\n"),
          url: opportunity.officialUrl,
        })
      }
    />
  );
}
