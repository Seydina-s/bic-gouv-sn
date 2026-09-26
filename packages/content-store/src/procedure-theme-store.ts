import { readFile } from "node:fs/promises";
import {
  procedureThemeSchema,
  procedureThemesFileSchema,
  type ProcedureThemeInput,
  type ProcedureThemesFile,
  type ThemeAssignment,
} from "@bgs/shared-types";
import { writeFileDurably } from "./durable-file";

const EMPTY: ProcedureThemesFile = { schemaVersion: 1, themes: [], assignments: {} };

/**
 * Official themes of the procedures and the theme of each procedure: proposed by
 * the platform, then validated by a person. A proposal never replaces a validation.
 * One validated JSON file, written durably (PostgreSQL later, same interface).
 */
export class FileProcedureThemeStore {
  constructor(private readonly path: string) {}

  async read(): Promise<ProcedureThemesFile> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return EMPTY;
      }
      throw error;
    }
    return procedureThemesFileSchema.parse(JSON.parse(raw));
  }

  /**
   * Replaces the official themes (as collected from the source). Themes the platform
   * added are kept: a new collection never removes them.
   */
  async saveThemes(themes: ProcedureThemeInput[]): Promise<void> {
    const file = await this.read();
    const official = themes.map((theme) =>
      procedureThemeSchema.parse({ ...theme, origin: "source" }),
    );
    const added = file.themes.filter((theme) => theme.origin === "platform");
    await this.write({ ...file, themes: [...official, ...added] });
  }

  /** Creates or updates themes added by the platform (never an official one). */
  async savePlatformThemes(themes: ProcedureThemeInput[]): Promise<void> {
    const file = await this.read();
    const added = themes.map((theme) =>
      procedureThemeSchema.parse({ ...theme, origin: "platform" }),
    );
    const ids = new Set(added.map((theme) => theme.id));
    if (file.themes.some((theme) => theme.origin === "source" && ids.has(theme.id))) {
      throw new Error("A platform theme cannot replace an official theme");
    }
    const kept = file.themes.filter((theme) => !ids.has(theme.id));
    await this.write({ ...file, themes: [...kept, ...added] });
  }

  /**
   * Files procedures under themes on someone's behalf (e.g. a classification the
   * user delegated). What a person validated in the console is never replaced:
   * only procedures proposed, unclassified, or filed by this same reviewer change.
   */
  async applyClassification(
    classification: Record<string, string>,
    reviewer: string,
    now: string,
  ): Promise<{ applied: string[]; keptPersonal: string[] }> {
    const file = await this.read();
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
    if (applied.length > 0) {
      await this.write({ ...file, assignments });
    }
    return { applied, keptPersonal };
  }

  /**
   * Records proposals. Validated procedures are left untouched; returns how many
   * proposals were added or changed.
   */
  async propose(proposals: Record<string, string>, now: string): Promise<number> {
    const file = await this.read();
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
    if (changed > 0) {
      await this.write({ ...file, assignments });
    }
    return changed;
  }

  /**
   * A person confirms (or corrects) the theme of these procedures. Returns the
   * assignments as they were before, for the audit journal.
   */
  async validate(
    slugs: readonly string[],
    themeId: string,
    reviewer: string,
    now: string,
  ): Promise<Record<string, ThemeAssignment | null>> {
    const file = await this.read();
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
    await this.write({ ...file, assignments });
    return before;
  }

  private async write(file: ProcedureThemesFile): Promise<void> {
    const valid = procedureThemesFileSchema.parse(file);
    await writeFileDurably(this.path, JSON.stringify(valid, null, 2));
  }
}
