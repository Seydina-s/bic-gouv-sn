import { serviceCategorySchema } from "@bgs/shared-types";
import Link from "next/link";
import { t } from "../../../lib/i18n";
import { requireAccount } from "../../../lib/session";
import { AddServiceForm } from "./AddServiceForm";

export const dynamic = "force-dynamic";

/**
 * Adding a service OpenStreetMap misses. It joins the services to verify, so a person
 * still checks it before it reaches the app.
 */
export default async function AddServicePage() {
  await requireAccount();
  const categories = serviceCategorySchema.options.map((value) => ({
    value,
    label: t(`services.category.${value}`),
  }));
  return (
    <section aria-labelledby="add-title" className="space-y-6">
      <Link href="/services" className="font-semibold text-brand underline underline-offset-4">
        {t("services.back")}
      </Link>
      <h1 id="add-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("services.addTitle")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("services.addIntro")}</p>
      <AddServiceForm categories={categories} />
    </section>
  );
}
