import { z } from "zod";

/** Languages supported by the app: French and Wolof. */
export const langSchema = z.enum(["fr", "wo"]);
export type Lang = z.infer<typeof langSchema>;

/** ISO 8601 date-time with an explicit offset (e.g. 2026-09-24T10:00:00Z). */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Calendar date without time (e.g. 2026-09-24), when the source gives no hour. */
export const isoDateSchema = z.iso.date();

export const httpsUrlSchema = z.url({ protocol: /^https$/ });

/** Lowercase hex SHA-256 digest, used to detect content changes. */
export const sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Expected a lowercase hex SHA-256");

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a kebab-case slug");

export const positiveIntSchema = z.int().positive();
