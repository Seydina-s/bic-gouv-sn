import type { AppFeature } from "@bgs/shared-types";
import type { ReactNode } from "react";
import { NoticeScreen } from "../../components/NoticeScreen";
import { useTranslation } from "../../i18n/useTranslation";
import { useFeature, useUpdateRequired } from "./useRemoteConfig";

/** A whole screen behind a kill switch: off, it says so plainly instead. */
export function FeatureGate({
  feature,
  title,
  children,
}: {
  feature: AppFeature;
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const on = useFeature(feature);
  if (!on) {
    return <NoticeScreen title={title} heading={t("remote.offTitle")} body={t("remote.offBody")} />;
  }
  return children;
}

/** The whole app, unless this version is older than the oldest one still allowed. */
export function UpdateGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  if (useUpdateRequired()) {
    return (
      <NoticeScreen
        title={t("app.name")}
        heading={t("remote.updateTitle")}
        body={t("remote.updateBody")}
      />
    );
  }
  return children;
}
