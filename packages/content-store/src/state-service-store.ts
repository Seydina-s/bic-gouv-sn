import {
  stateServicesFileSchema,
  type GeoPoint,
  type Place,
  type ServiceCategory,
  type ServiceFacts,
  type StateService,
  type StateServicesFile,
} from "@bgs/shared-types";
import { TypedDocument, type JsonDocument } from "./json-document";

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

/** A new service waiting for a person's review: never shown before it. */
function asProposal(found: ImportedService): StateService {
  return {
    ...found,
    status: "proposed",
    reviewedBy: null,
    reviewedAt: null,
    pendingUpdate: null,
    corrections: {},
  };
}

/**
 * The internal base of state services and the towns used to search them. Imports
 * only ever add proposals; a person verifies or rejects each service in the console,
 * and only verified services are shown. One validated document, in a file or in
 * PostgreSQL (SCALE-02); each change reads and writes it under one lock.
 */
export class StateServiceStore {
  private readonly document: TypedDocument<StateServicesFile>;

  constructor(document: JsonDocument) {
    this.document = new TypedDocument(document, stateServicesFileSchema, EMPTY);
  }

  read(): Promise<StateServicesFile> {
    return this.document.read();
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
  importServices(imported: ImportedService[], places: Place[]): Promise<ImportOutcome> {
    return this.document.change((file) => {
      const services = { ...file.services };
      const outcome: ImportOutcome = { added: 0, updated: 0, unchanged: 0, changedAfterReview: 0 };
      for (const found of imported) {
        const current = services[found.id];
        if (current === undefined) {
          services[found.id] = asProposal(found);
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
      const next = { ...file, services, places: places.length > 0 ? places : file.places };
      return { next, result: outcome };
    });
  }

  /**
   * A person's decision on services they checked in the console. Verifying a service
   * whose source changed takes the change they were shown. Unknown ids are ignored
   * and left out of the returned list.
   */
  review(
    ids: readonly string[],
    decision: ReviewDecision,
    reviewer: string,
    now: string,
  ): Promise<string[]> {
    return this.document.change((file) => {
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
      return { next: { ...file, services }, result: reviewed };
    });
  }

  /**
   * A service a person typed in the console because the source misses it: a proposal
   * like the imported ones, shown once verified. Null when its id is already taken.
   */
  add(service: ImportedService): Promise<StateService | null> {
    return this.document.change((file) => {
      if (file.services[service.id] !== undefined) {
        return { result: null };
      }
      const added = asProposal(service);
      return {
        next: { ...file, services: { ...file.services, [service.id]: added } },
        result: added,
      };
    });
  }

  /**
   * A person's corrections to a service (its kind, its name, its place on the map),
   * kept apart from the source's facts so that no import undoes them. A correction
   * equal to what the source says is dropped. Null when the service is unknown.
   */
  correct(id: string, correction: ServiceCorrection): Promise<StateService | null> {
    return this.document.change((file) => {
      const current = file.services[id];
      if (current === undefined) {
        return { result: null };
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
      return {
        next: { ...file, services: { ...file.services, [id]: corrected } },
        result: corrected,
      };
    });
  }
}
