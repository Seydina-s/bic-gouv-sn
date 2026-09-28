"use client";

import { APP_FEATURES, type RemoteConfig } from "@bgs/shared-types";
import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { field, primaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { saveRemoteConfig } from "./actions";

/** One switch per feature, then the minimum version: saved together. */
export function RemoteConfigForm({ config }: { config: RemoteConfig }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRemoteConfig, {});
  return (
    <form action={action} className="max-w-xl space-y-6">
      <fieldset className="space-y-3">
        <legend className="font-semibold">{t("remote.features")}</legend>
        {APP_FEATURES.map((feature) => (
          <label
            key={feature}
            className="flex min-h-12 cursor-pointer items-center gap-4 rounded-md border border-line px-4"
          >
            <input
              type="checkbox"
              name={feature}
              defaultChecked={config.features[feature]}
              className="size-5 shrink-0 accent-primary"
            />
            <span className="flex-1">{t(`remote.feature.${feature}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-2">
        <label htmlFor="minVersion" className="block font-semibold">
          {t("remote.minVersion")}
        </label>
        <p id="min-version-help" className="text-sm text-ink-soft">
          {t("remote.minVersionHelp")}
        </p>
        <input
          id="minVersion"
          name="minVersion"
          defaultValue={config.minVersion ?? ""}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby="min-version-help"
          className={field}
        />
      </div>
      <FormOutcome state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("remote.save")}
      </button>
    </form>
  );
}
