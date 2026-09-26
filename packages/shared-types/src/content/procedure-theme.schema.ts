import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";
import { procedureSchema } from "./procedure.schema";

/**
 * Official themes of e-senegal.sn (names and icons of the source). The source does
 * not link procedures to them yet: the platform proposes a theme per procedure and
 * a person validates it before it is shown (decisions.md, 26/09/2026).
 */
export const procedureThemeSchema = z.strictObject({
  /** Identifier at the source. */
  id: z.string().regex(/^[a-z0-9]+$/),
  title: z.string().min(1),
  /** Icon name at the source (Font Awesome, e.g. "fa-bus-alt"); the app maps it. */
  sourceIcon: z.string().nullable(),
  fetchedAt: isoDateTimeSchema,
});
export type ProcedureTheme = z.infer<typeof procedureThemeSchema>;

export const themeAssignmentSchema = z.strictObject({
  themeId: z.string().min(1),
  /** "proposed": computed, never shown; "validated": checked by a person, shown. */
  status: z.enum(["proposed", "validated"]),
  proposedAt: isoDateTimeSchema,
  /** Account that validated, and when; null while only proposed. */
  reviewedBy: z.string().nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
});
export type ThemeAssignment = z.infer<typeof themeAssignmentSchema>;

export const procedureThemesFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  themes: z.array(procedureThemeSchema),
  /** Keyed by procedure slug. */
  assignments: z.record(procedureSchema.shape.slug, themeAssignmentSchema),
});
export type ProcedureThemesFile = z.infer<typeof procedureThemesFileSchema>;
