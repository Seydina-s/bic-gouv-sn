import { readFile } from "node:fs/promises";
import {
  stateServicesFileSchema,
  type GeoPoint,
  type Place,
  type ServiceCategory,
  type ServiceFacts,
  type StateService,
  type StateServicesFile,
} from "@bgs/shared-types";
import { writeFileDurably } from "./durable-file";

const EMPTY: StateServicesFile = { schemaVersion: 1, services: {}, places: [] };

/** A service as an import finds it: everything but the review. */
export type ImportedService = Omit<
  StateService,
  "status" | "reviewedBy" | "reviewedAt" | "pendingUpdate" | "corrections"
>;

/** What a person may correct in the console. */
export interface ServiceCorrection {
  category?: ServiceCategory;
  name?: string;
  location?: GeoPoint;
}

export interface ImportOutcome {
  added: number;
  updated: number;
  unchanged: number;
  /** Reviewed services whose source changed: kept as reviewed, change set aside. */
  changedAfterReview: number;
}

export type ReviewDecision = "verified" | "rejected";

function factsOf(service: ServiceFacts): ServiceFacts {
  const { category, name, address, town, location, phone, website, openingHours } = service;
  return { category, name, address, town, location, phone, website, openingHours };
}

function sameFacts(a: ServiceFacts, b: ServiceFacts): boolean {
  return JSON.stringify(factsOf(a)) === JSON.stringify(factsOf(b));
}

/**
 * The internal base of state services and the towns used to search them. Imports
 * only ever add proposals; a person verifies or rejects each service in the console,
 * and only verified services are shown. One JSON file written durably (PostgreSQL
 * and PostGIS later, same interface).
 */
export class FileStateServiceStore {
  constructor(private readonly path: string) {}

  async read(): Promise<StateServicesFile> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return EMPTY;
      }
      throw error;
    }
    return stateServicesFileSchema.parse(JSON.parse(raw));
  }

  /** Services checked by a person: the only ones the app shows. */
  async verified(): Promise<StateService[]> {
    const { services } = await this.read();
    return Object.values(services).filter((service) => service.status === "verified");
  }

  /**
   * Records what an import found. A new service is a proposal; a proposal follows
   * its source; a reviewed service keeps its reviewed facts and sets the source's
   * change aside for a person. Services the import no longer finds stay as they are.
   * The towns are replaced when the import brings some.
   */
  async importServices(imported: ImportedService[], places: Place[]): Promise<ImportOutcome> {
    const file = await this.read();
    const services = { ...file.services };
    const outcome: ImportOutcome = { added: 0, updated: 0, unchanged: 0, changedAfterReview: 0 };
    for (const found of imported) {
      const current = services[found.id];
      if (current === undefined) {
        services[found.id] = {
          ...found,
          status: "proposed",
          reviewedBy: null,
          reviewedAt: null,
          pendingUpdate: null,
          corrections: {},
        };
        outcome.added += 1;
      } else if (sameFacts(current, found)) {
        services[found.id] = { ...current, origin: found.origin };
        outcome.unchanged += 1;
      } else if (current.status === "proposed") {
        services[found.id] = { ...current, ...found };
        outcome.updated += 1;
      } else {
        services[found.id] = { ...current, origin: found.origin, pendingUpdate: factsOf(found) };
        outcome.changedAfterReview += 1;
      }
    }
    await this.write({ ...file, services, places: places.length > 0 ? places : file.places });
    return outcome;
  }

  /**
   * A person's decision on services they checked in the console. Verifying a service
   * whose source changed takes the change they were shown. Unknown ids are ignored
   * and left out of the returned list.
   */
  async review(
    ids: readonly string[],
    decision: ReviewDecision,
    reviewer: string,
    now: string,
  ): Promise<string[]> {
    const file = await this.read();
    const services = { ...file.services };
    const reviewed: string[] = [];
    for (const id of ids) {
      const current = services[id];
      if (current === undefined) {
        continue;
      }
      const facts =
        decision === "verified" && current.pendingUpdate !== null ? current.pendingUpdate : {};
      services[id] = {
        ...current,
        ...facts,
        status: decision,
        reviewedBy: reviewer,
        reviewedAt: now,
        pendingUpdate: null,
      };
      reviewed.push(id);
    }
    await this.write({ ...file, services });
    return reviewed;
  }

  /**
   * A person's corrections to a service (its kind, its name, its place on the map),
   * kept apart from the source's facts so that no import undoes them. A correction
   * equal to what the source says is dropped. Null when the service is unknown.
   */
  async correct(id: string, correction: ServiceCorrection): Promise<StateService | null> {
    const file = await this.read();
    const current = file.services[id];
    if (current === undefined) {
      return null;
    }
    const corrections = { ...current.corrections, ...correction };
    if (corrections.category === current.category) {
      delete corrections.category;
    }
    if (corrections.name === current.name) {
      delete corrections.name;
    }
    const { location } = corrections;
    if (location?.lat === current.location.lat && location.lng === current.location.lng) {
      delete corrections.location;
    }
    const corrected = { ...current, corrections };
    await this.write({ ...file, services: { ...file.services, [id]: corrected } });
    return corrected;
  }

  private async write(file: StateServicesFile): Promise<void> {
    const valid = stateServicesFileSchema.parse(file);
    await writeFileDurably(this.path, JSON.stringify(valid, null, 2));
  }
}
