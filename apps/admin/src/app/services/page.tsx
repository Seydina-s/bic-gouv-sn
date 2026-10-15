import { serviceCategorySchema, type ServiceCategory } from "@bgs/shared-types";
import Link from "next/link";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { secondaryLink } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { checkLink, movedFrom, positionText } from "../../lib/position";
import { serviceHints } from "@bgs/shared-types";
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
      /** What the source says, when a person corrected the kind, the name or the place. */
      source: z
        .object({
          category: serviceCategorySchema,
          name: z.string(),
          // Older API versions did not send the source's place.
          location: z.object({ lat: z.number(), lng: z.number() }).optional(),
        })
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
  const from = movedFrom(row.location, row.source?.location);
  const moved =
    from === null ? [] : [t("services.sourcePosition", { position: positionText(from) })];
  return {
    id: row.id,
    name: row.name,
    details: [...corrected, ...moved, ...changed, ...details],
    hints: serviceHints(row.name).map((hint) =>
      hint === "notState" ? t("services.hintNotState") : t("services.hintVague"),
    ),
    mapUrl: checkLink(row.osmUrl, row.location, from !== null),
  };
}

function label(category: ServiceCategory): string {
  return t(`services.category.${category}`);
}

/**
 * The state services, validated by default (owner's decision of 14/10/2026): the
 * categories first, each opening its services to correct them; only names that look
 * like a company, and changes at the source, wait for a person here. Dakar first.
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
  const selected = categories.find((category) => category === params.category) ?? null;
  const rows = selected === null ? [] : inZone.filter((row) => row.category === selected);
  const waiting = rows.filter((row) => row.status === "proposed");
  const shown = rows.filter((row) => row.status === "verified");
  const changed = inZone.filter((row) => row.pendingUpdate !== null);
  const href = (next: { category?: string | null; zone?: string }) => {
    const category = next.category === undefined ? selected : next.category;
    return `/services?zone=${next.zone ?? zone}${category === null ? "" : `&category=${category}`}`;
  };
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

      {changed.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="font-display text-2xl font-bold">{t("services.changedTitle")}</h2>
          <p className="text-ink-soft">{t("services.changedIntro")}</p>
          <ServiceReviewForm services={changed.map(toReview)} />
        </div>
      )}

      {selected === null ? (
        <nav aria-label={t("services.categories")} className="mt-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category}>
                <Link
                  href={href({ category })}
                  className="block h-full rounded-lg border border-line p-5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="block font-display text-lg font-bold">{label(category)}</span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {t("services.verified", { count: count(category, "verified") })}
                    {count(category, "proposed") > 0 &&
                      ` · ${t("services.toCheck", { count: count(category, "proposed") })}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <div className="mt-8 space-y-10">
          <Link href={href({ category: null })} className={secondaryLink}>
            {t("services.allCategories")}
          </Link>
          {waiting.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">
                {t("services.proposedTitle", { category: label(selected) })}
              </h2>
              <p className="text-ink-soft">{t("services.proposedIntro")}</p>
              <ServiceReviewForm services={waiting.map(toReview)} />
            </div>
          )}
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold">{label(selected)}</h2>
            {shown.length === 0 ? (
              <p>{t("services.none")}</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {shown.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{row.name}</span>
                      <span className="block text-sm text-ink-soft">
                        {[row.town ?? row.nearTown, row.address].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Link href={`/services/${row.id}`} className={secondaryLink}>
                      {t("services.correct")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
