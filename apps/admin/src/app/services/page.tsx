import { serviceCategorySchema, type ServiceCategory } from "@bgs/shared-types";
import Link from "next/link";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formatDay } from "../../lib/format";
import { secondaryLink } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { serviceHints } from "../../lib/service-hints";
import { requireAccount } from "../../lib/session";
import { ServiceReviewForm, type ReviewService } from "./ServiceReviewForm";

export const dynamic = "force-dynamic";

/** Approximate box of the Dakar region: the pilot zone of the map (CLAUDE.md, Phase 3). */
const DAKAR_REGION = { south: 14.53, north: 14.9, west: -17.56, east: -17.1 };

const listSchema = z.object({
  services: z.array(
    z.object({
      id: z.string(),
      category: serviceCategorySchema,
      name: z.string(),
      address: z.string().nullable(),
      town: z.string().nullable(),
      location: z.object({ lat: z.number(), lng: z.number() }),
      phone: z.string().nullable(),
      openingHours: z.string().nullable(),
      status: z.enum(["proposed", "verified", "rejected"]),
      reviewedAt: z.string().nullable(),
      pendingUpdate: z.object({ name: z.string() }).nullable(),
      osmUrl: z.string().nullable(),
      nearTown: z.string().nullable().default(null),
      /** What the source says, when a person corrected the kind or the name. */
      source: z
        .object({ category: serviceCategorySchema, name: z.string() })
        .nullable()
        .default(null),
    }),
  ),
});

type Row = z.infer<typeof listSchema>["services"][number];

function inDakar({ location }: Row): boolean {
  const { south, north, west, east } = DAKAR_REGION;
  return (
    location.lat >= south && location.lat <= north && location.lng >= west && location.lng <= east
  );
}

function toReview(row: Row): ReviewService {
  const place =
    row.town ?? (row.nearTown === null ? null : t("services.nearTown", { town: row.nearTown }));
  const details = [place, row.address, row.openingHours, row.phone].filter(
    (detail): detail is string => detail !== null,
  );
  const changed =
    row.pendingUpdate === null ? [] : [t("services.sourceNow", { name: row.pendingUpdate.name })];
  const corrected =
    row.source === null
      ? []
      : [
          t("services.correctedFrom", {
            name: row.source.name,
            category: label(row.source.category),
          }),
        ];
  return {
    id: row.id,
    name: row.name,
    details: [...corrected, ...changed, ...details],
    hints: serviceHints(row.name).map((hint) =>
      hint === "notState" ? t("services.hintNotState") : t("services.hintVague"),
    ),
    osmUrl: row.osmUrl,
  };
}

function label(category: ServiceCategory): string {
  return t(`services.category.${category}`);
}

/**
 * Verification of the state services imported from OpenStreetMap: nothing reaches
 * the app before a person has checked it here (CLAUDE.md §1). Dakar first.
 */
export default async function StateServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; zone?: string }>;
}) {
  const { token } = await requireAccount();
  const listing = await adminRequest({ path: "/services", token, schema: listSchema });
  if (!listing.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {listing.status === 403 ? t("review.forbidden") : t("review.failed")}
      </p>
    );
  }
  const params = await searchParams;
  const zone = params.zone === "all" ? "all" : "dakar";
  const inZone = listing.data.services.filter((row) => zone === "all" || inDakar(row));
  const categories = serviceCategorySchema.options;
  const count = (category: ServiceCategory, status: Row["status"]) =>
    inZone.filter((row) => row.category === category && row.status === status).length;
  const selected =
    categories.find((category) => category === params.category) ??
    categories.find((category) => count(category, "proposed") > 0) ??
    "mairie";
  const rows = inZone.filter((row) => row.category === selected);
  // Names of companies last: the likely state services come first.
  const likelyPrivate = (row: Row) => serviceHints(row.name).includes("notState");
  const proposed = rows
    .filter((row) => row.status === "proposed")
    .sort((a, b) => Number(likelyPrivate(a)) - Number(likelyPrivate(b)));
  const verified = rows.filter((row) => row.status === "verified");
  const changed = inZone.filter((row) => row.pendingUpdate !== null);
  const href = (next: { category?: string; zone?: string }) =>
    `/services?zone=${next.zone ?? zone}&category=${next.category ?? selected}`;
  const tab =
    "rounded-md px-3 py-2 font-semibold hover:bg-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container";

  return (
    <section aria-labelledby="services-title">
      <h1 id="services-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("services.title")}
      </h1>
      <p className="mt-2 max-w-prose text-ink-soft">{t("services.intro")}</p>
      <p className="mt-1 text-sm text-ink-faint">{t("services.attribution")}</p>
      <Link href="/services/nouveau" className={`mt-4 ${secondaryLink}`}>
        {t("services.addService")}
      </Link>

      <nav aria-label={t("services.zone")} className="mt-6 flex flex-wrap gap-2">
        <Link
          href={href({ zone: "dakar" })}
          aria-current={zone === "dakar" ? "page" : undefined}
          className={tab}
        >
          {t("services.zoneDakar")}
        </Link>
        <Link
          href={href({ zone: "all" })}
          aria-current={zone === "all" ? "page" : undefined}
          className={tab}
        >
          {t("services.zoneAll")}
        </Link>
      </nav>

      <div className="mt-8 grid gap-10 md:grid-cols-[18rem_1fr]">
        <nav aria-label={t("services.categories")}>
          <ul className="space-y-1">
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={href({ category })}
                  aria-current={category === selected ? "page" : undefined}
                  className="block rounded-md px-3 py-2 hover:bg-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container"
                >
                  <span className="block font-semibold">{label(category)}</span>
                  <span className="block text-sm text-ink-soft">
                    {`${t("services.toCheck", { count: count(category, "proposed") })} · ${t("services.verified", { count: count(category, "verified") })}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-10">
          {changed.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">{t("services.changedTitle")}</h2>
              <p className="text-ink-soft">{t("services.changedIntro")}</p>
              <ServiceReviewForm services={changed.map(toReview)} />
            </div>
          )}
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">
              {t("services.proposedTitle", { category: label(selected) })}
            </h2>
            {proposed.length === 0 ? (
              <p>{t("services.none")}</p>
            ) : (
              <>
                <p className="text-ink-soft">{t("services.proposedIntro")}</p>
                <ServiceReviewForm services={proposed.map(toReview)} />
              </>
            )}
          </div>
          {verified.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold">
                {t("services.verifiedTitle", { category: label(selected) })}
              </h2>
              <ul className="list-disc space-y-1 pl-6 text-ink-soft">
                {verified.map((row) => (
                  <li key={row.id}>
                    {row.name}
                    {row.reviewedAt !== null && (
                      <span className="ml-2 text-sm text-ink-faint">
                        {t("services.verifiedOn", { date: formatDay(new Date(row.reviewedAt)) })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
