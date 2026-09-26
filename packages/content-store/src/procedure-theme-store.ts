import { readFile } from "node:fs/promises";
import {
  procedureThemesFileSchema,
  type ProcedureTheme,
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

  /** Replaces the list of themes (as collected from the source). */
  async saveThemes(themes: ProcedureTheme[]): Promise<void> {
    const file = await this.read();
    await this.write({ ...file, themes });
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
