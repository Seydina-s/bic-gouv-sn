import {
  procedureThemeSchema,
  procedureThemesFileSchema,
  type ProcedureThemeInput,
  type ProcedureThemesFile,
  type ThemeAssignment,
} from "@bgs/shared-types";
import { TypedDocument, type JsonDocument } from "./json-document";

const EMPTY: ProcedureThemesFile = { schemaVersion: 1, themes: [], assignments: {} };

/**
 * Official themes of the procedures and the theme of each procedure: proposed by
 * the platform, then validated by a person. A proposal never replaces a validation.
 * One validated document, in a file or in PostgreSQL (SCALE-02); each change reads
 * and writes it under one lock.
 */
export class ProcedureThemeStore {
  private readonly document: TypedDocument<ProcedureThemesFile>;

  constructor(document: JsonDocument) {
    this.document = new TypedDocument(document, procedureThemesFileSchema, EMPTY);
  }

  read(): Promise<ProcedureThemesFile> {
    return this.document.read();
  }

  /**
   * Replaces the official themes (as collected from the source). Themes the platform
   * added are kept: a new collection never removes them.
   */
  saveThemes(themes: ProcedureThemeInput[]): Promise<void> {
    return this.document.change((file) => {
      const official = themes.map((theme) =>
        procedureThemeSchema.parse({ ...theme, origin: "source" }),
      );
      const added = file.themes.filter((theme) => theme.origin === "platform");
      return { next: { ...file, themes: [...official, ...added] }, result: undefined };
    });
  }

  /** Creates or updates themes added by the platform (never an official one). */
  savePlatformThemes(themes: ProcedureThemeInput[]): Promise<void> {
    return this.document.change((file) => {
      const added = themes.map((theme) =>
        procedureThemeSchema.parse({ ...theme, origin: "platform" }),
      );
      const ids = new Set(added.map((theme) => theme.id));
      if (file.themes.some((theme) => theme.origin === "source" && ids.has(theme.id))) {
        throw new Error("A platform theme cannot replace an official theme");
      }
      const kept = file.themes.filter((theme) => !ids.has(theme.id));
      return { next: { ...file, themes: [...kept, ...added] }, result: undefined };
    });
  }

  /**
   * Files procedures under themes on someone's behalf (e.g. a classification the
   * user delegated). What a person validated in the console is never replaced:
   * only procedures proposed, unclassified, or filed by this same reviewer change.
   */
  applyClassification(
    classification: Record<string, string>,
    reviewer: string,
    now: string,
  ): Promise<{ applied: string[]; keptPersonal: string[] }> {
    return this.document.change((file) => {
      const known = new Set(file.themes.map((theme) => theme.id));
      const assignments = { ...file.assignments };
      const applied: string[] = [];
      const keptPersonal: string[] = [];
      for (const [slug, themeId] of Object.entries(classification)) {
        if (!known.has(themeId)) {
          throw new Error(`Unknown theme ${themeId}`);
        }
        const current = assignments[slug];
        if (current?.status === "validated" && current.reviewedBy !== reviewer) {
          keptPersonal.push(slug);
          continue;
        }
        if (current?.status === "validated" && current.themeId === themeId) {
          continue;
        }
        assignments[slug] = {
          themeId,
          status: "validated",
          proposedAt: current?.proposedAt ?? now,
          reviewedBy: reviewer,
          reviewedAt: now,
        };
        applied.push(slug);
      }
      const result = { applied, keptPersonal };
      return applied.length > 0 ? { next: { ...file, assignments }, result } : { result };
    });
  }

  /**
   * Records proposals. Validated procedures are left untouched; returns how many
   * proposals were added or changed.
   */
  propose(proposals: Record<string, string>, now: string): Promise<number> {
    return this.document.change((file) => {
      const assignments = { ...file.assignments };
      let changed = 0;
      for (const [slug, themeId] of Object.entries(proposals)) {
        const current = assignments[slug];
        if (current?.status === "validated" || current?.themeId === themeId) {
          continue;
        }
        assignments[slug] = {
          themeId,
          status: "proposed",
          proposedAt: now,
          reviewedBy: null,
          reviewedAt: null,
        };
        changed += 1;
      }
      return changed > 0
        ? { next: { ...file, assignments }, result: changed }
        : { result: changed };
    });
  }

  /**
   * A person confirms (or corrects) the theme of these procedures. Returns the
   * assignments as they were before, for the audit journal.
   */
  validate(
    slugs: readonly string[],
    themeId: string,
    reviewer: string,
    now: string,
  ): Promise<Record<string, ThemeAssignment | null>> {
    return this.document.change((file) => {
      if (!file.themes.some((theme) => theme.id === themeId)) {
        throw new Error(`Unknown theme ${themeId}`);
      }
      const assignments = { ...file.assignments };
      const before: Record<string, ThemeAssignment | null> = {};
      for (const slug of slugs) {
        before[slug] = assignments[slug] ?? null;
        assignments[slug] = {
          themeId,
          status: "validated",
          proposedAt: assignments[slug]?.proposedAt ?? now,
          reviewedBy: reviewer,
          reviewedAt: now,
        };
      }
      return { next: { ...file, assignments }, result: before };
    });
  }
}
