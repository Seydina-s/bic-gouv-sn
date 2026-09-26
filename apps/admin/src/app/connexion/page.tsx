import { redirect } from "next/navigation";
import { t } from "../../lib/i18n";
import { currentAccount } from "../../lib/session";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

/** Sign-in of the administration team (password, then a one-time code). */
export default async function SignInPage() {
  if ((await currentAccount()) !== null) {
    redirect("/");
  }
  return (
    <section aria-labelledby="sign-in-title" className="mx-auto max-w-md">
      <h1 id="sign-in-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("signIn.title")}
      </h1>
      <p className="mt-2 text-ink-soft">{t("signIn.intro")}</p>
      <SignInForm />
    </section>
  );
}
