import { CircuitBreaker, createResilientCall } from "@bgs/resilience";
import { z } from "zod";
import { QuarantineError, SourceUnreachableError } from "../../lib/errors";
import { USER_AGENT } from "../presidence/presidence-provider";

/** Public Overpass API (OpenStreetMap data, ODbL): one polite query per import. */
export const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/**
 * State services of Senegal and its cities and towns, in one query. "out center"
 * gives a point for buildings and areas too.
 */
export const SERVICES_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="SN"][admin_level=2]->.sn;
(
  nwr["amenity"~"^(townhall|police|courthouse)$"](area.sn);
  nwr["office"="government"](area.sn);
  node["place"~"^(city|town)$"](area.sn);
);
out center tags;`;

const pointSchema = z.object({ lat: z.number(), lon: z.number() });

export const overpassElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.int().positive(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: pointSchema.optional(),
  tags: z.record(z.string(), z.string()).optional(),
});
export type OverpassElement = z.infer<typeof overpassElementSchema>;

const responseSchema = z.object({ elements: z.array(overpassElementSchema) });

export interface OverpassOptions {
  fetchImpl?: typeof fetch;
}

/** Runs the query once, with a timeout, retries on server errors and a breaker. */
export async function fetchStateServices({ fetchImpl = fetch }: OverpassOptions = {}): Promise<
  OverpassElement[]
> {
  const call = createResilientCall({
    breaker: new CircuitBreaker({
      dependency: "overpass-api.de",
      failureThreshold: 3,
      resetTimeoutMs: 60_000,
      isFailure: (error) => !(error instanceof QuarantineError),
    }),
    timeoutMs: 200_000,
    retry: {
      idempotent: true,
      maxAttempts: 3,
      baseDelayMs: 5000,
      maxDelayMs: 30_000,
      shouldRetry: (error) =>
        !(error instanceof SourceUnreachableError && error.status !== null && error.status < 500),
    },
  });
  const body = await call(async (signal) => {
    const response = await fetchImpl(OVERPASS_API, {
      method: "POST",
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ data: SERVICES_QUERY }).toString(),
    }).catch((error: unknown) => {
      throw signal.aborted ? error : new SourceUnreachableError(OVERPASS_API, null);
    });
    if (!response.ok) {
      throw new SourceUnreachableError(OVERPASS_API, response.status);
    }
    return (await response.json()) as unknown;
  });
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new QuarantineError(OVERPASS_API, "unexpected Overpass response");
  }
  return parsed.data.elements;
}
