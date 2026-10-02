import { randomUUID } from "node:crypto";
import {
  byClosingDate,
  isOpen,
  opportunitySchema,
  type ErrorCode,
  type Opportunity,
  type OpportunityDraft,
  type PublicOpportunity,
} from "@bgs/shared-types";
import type { AuditJournal } from "../admin/audit-journal";
import type { Database } from "../database/database";
import {
  type DocumentStore,
  FileDocumentStore,
  PostgresDocumentStore,
} from "../database/document-store";
import type { Person } from "../notifications/notifications";

export type OpportunityStore = DocumentStore<Opportunity>;

export class FileOpportunityStore extends FileDocumentStore<Opportunity> {
  constructor(path: string) {
    super(path, opportunitySchema, "opportunities");
  }
}

/** Any number: the instances changing the opportunities take turns. */
const OPPORTUNITIES_LOCK = 20_261_001;

export class PostgresOpportunityStore extends PostgresDocumentStore<Opportunity> {
  constructor(database: Database) {
    super(database, opportunitySchema, "opportunities", OPPORTUNITIES_LOCK);
  }
}

/** A rule of the two-person workflow was not met; the code explains it in the console. */
export class OpportunityRuleError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "OpportunityRuleError";
  }
}

/** The day in Dakar (UTC all year round), as YYYY-MM-DD. */
function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Opportunités (decision of the user, 01/10/2026): one person prepares an
 * opportunity from its official page, another publishes it, either withdraws it.
 * Every step goes to the audit journal.
 */
export class OpportunityService {
  constructor(
    private readonly store: OpportunityStore,
    private readonly journal: AuditJournal | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** For the console: every opportunity, latest prepared first. */
  async list(): Promise<Opportunity[]> {
    return (await this.store.all()).sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));
  }

  /** For the app: published and still open, closing soonest first. */
  async published(): Promise<PublicOpportunity[]> {
    const today = dayOf(this.now());
    return (await this.store.all())
      .filter((item) => item.status === "published" && isOpen(item, today))
      .map((item): PublicOpportunity => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        organization: item.organization,
        summary: item.summary,
        deadline: item.deadline,
        officialUrl: item.officialUrl,
        publishedAt: item.publishedAt ?? item.preparedAt,
      }))
      .sort(byClosingDate);
  }

  async prepare(person: Person, draft: OpportunityDraft): Promise<Opportunity> {
    const at = this.now().toISOString();
    const opportunity: Opportunity = {
      ...draft,
      id: randomUUID(),
      status: "pending",
      preparedBy: person,
      preparedAt: at,
      publishedBy: null,
      publishedAt: null,
      withdrawnBy: null,
      withdrawnAt: null,
    };
    await this.store.update((all) => ({ next: [...all, opportunity], result: null }));
    await this.audit(person, "opportunity.prepared", opportunity, at);
    return opportunity;
  }

  /** A second person publishes: never the one who prepared it. */
  publish(person: Person, id: string): Promise<Opportunity> {
    return this.decide(person, id, "opportunity.published", (item, at) => {
      if (item.status !== "pending") {
        throw new OpportunityRuleError("OPPORTUNITY_NOT_PENDING");
      }
      if (item.preparedBy.id === person.id) {
        throw new OpportunityRuleError("OPPORTUNITY_SAME_PERSON");
      }
      return { ...item, status: "published", publishedBy: person, publishedAt: at };
    });
  }

  /** Corrected before it is published (a typo, a date): the second person still checks. */
  correct(person: Person, id: string, draft: OpportunityDraft): Promise<Opportunity> {
    return this.decide(person, id, "opportunity.corrected", (item) => {
      if (item.status !== "pending") {
        throw new OpportunityRuleError("OPPORTUNITY_NOT_PENDING");
      }
      return { ...item, ...draft };
    });
  }

  /** Taken out of the app (closed early, mistaken): kept in the history. */
  withdraw(person: Person, id: string): Promise<Opportunity> {
    return this.decide(person, id, "opportunity.withdrawn", (item, at) => {
      if (item.status === "withdrawn") {
        throw new OpportunityRuleError("OPPORTUNITY_NOT_PENDING");
      }
      return { ...item, status: "withdrawn", withdrawnBy: person, withdrawnAt: at };
    });
  }

  private async decide(
    person: Person,
    id: string,
    action: string,
    change: (item: Opportunity, at: string) => Opportunity,
  ): Promise<Opportunity> {
    const at = this.now().toISOString();
    const decided = await this.store.update((all) => {
      const item = all.find((one) => one.id === id);
      if (item === undefined) {
        throw new OpportunityRuleError("OPPORTUNITY_NOT_FOUND");
      }
      const next = change(item, at);
      return { next: all.map((one) => (one.id === id ? next : one)), result: next };
    });
    await this.audit(person, action, decided, at);
    return decided;
  }

  private async audit(person: Person, action: string, item: Opportunity, at: string) {
    await this.journal?.append({
      at,
      actor: person.id,
      action,
      target: item.id,
      details: { title: item.title, kind: item.kind },
    });
  }
}
