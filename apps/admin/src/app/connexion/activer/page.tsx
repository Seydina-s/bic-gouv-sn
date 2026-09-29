import { t } from "../../../lib/i18n";
import { ActivationForm } from "./ActivationForm";

export const dynamic = "force-dynamic";

/**
 * A new member of the team opens the link received from an administrator and
 * chooses a password; the second factor is set up at the first sign-in.
 */
export default function ActivationPage() {
  return (
    <section aria-labelledby="activation-title" className="mx-auto max-w-md">
      <h1 id="activation-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("activation.title")}
      </h1>
      <p className="mt-2 text-ink-soft">{t("activation.intro")}</p>
      <ActivationForm />
    </section>
  );
}
