import { geoPointSchema, serviceCategorySchema } from "@bgs/shared-types";
import Link from "next/link";
import { z } from "zod";
import { adminRequest } from "../../../lib/admin-api";
import { t } from "../../../lib/i18n";
import { positionLink, positionText, samePosition } from "../../../lib/position";
import { requireAccount } from "../../../lib/session";
import { CorrectionForm } from "./CorrectionForm";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  services: z.array(
    z.object({
      id: z.string(),
      category: serviceCategorySchema,
      name: z.string(),
      location: geoPointSchema,
      osmUrl: z.string().nullable(),
      source: z
        .object({
          category: serviceCategorySchema,
          name: z.string(),
          // Older API versions did not send the source's place.
          location: geoPointSchema.optional(),
        })
        .nullable()
        .default(null),
    }),
  ),
});

/**
 * Correcting one service before verifying it: a commissariat the source filed as a
 * town hall keeps its place instead of being rejected.
 */
export default async function CorrectServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { token } = await requireAccount();
  const { id } = await params;
  const listing = await adminRequest({ path: "/services", token, schema: listSchema });
  if (!listing.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {listing.status === 403 ? t("review.forbidden") : t("review.failed")}
      </p>
    );
  }
  const service = listing.data.services.find((item) => item.id === id);
  const back = (
    <Link href="/services" className="font-semibold text-brand underline underline-offset-4">
      {t("services.back")}
    </Link>
  );
  if (service === undefined) {
    return (
      <section className="space-y-4">
        <p>{t("services.unknown")}</p>
        {back}
      </section>
    );
  }
  const categories = serviceCategorySchema.options.map((value) => ({
    value,
    label: t(`services.category.${value}`),
  }));

  return (
    <section aria-labelledby="correct-title" className="space-y-6">
      {back}
      <h1 id="correct-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("services.correctTitle")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("services.correctIntro")}</p>
      {service.source !== null && (
        <p className="text-sm text-ink-soft">
          {t("services.correctedFrom", {
            name: service.source.name,
            category: t(`services.category.${service.source.category}`),
          })}
        </p>
      )}
      {service.source?.location !== undefined &&
        !samePosition(service.source.location, service.location) && (
          <p className="text-sm text-ink-soft">
            {t("services.sourcePosition", { position: positionText(service.source.location) })}
          </p>
        )}
      {service.osmUrl !== null && (
        <a
          href={service.osmUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-semibold text-brand underline underline-offset-4"
        >
          {t("services.openMap")}
        </a>
      )}
      <CorrectionForm
        id={service.id}
        name={service.name}
        category={service.category}
        categories={categories}
        position={positionText(service.location)}
        positionLink={positionLink(service.location)}
      />
    </section>
  );
}
