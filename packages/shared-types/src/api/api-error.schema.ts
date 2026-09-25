import { z } from "zod";

/**
 * Error body returned by every API route. `code` matches docs/errors-catalog.md,
 * where each code has a plain-language explanation for the admin.
 */
export const apiErrorSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Expected an UPPER_SNAKE_CASE error code"),
  message: z.string().min(1),
  requestId: z.string().min(1),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
