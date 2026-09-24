import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/** GET /v1/health: liveness probe used by the load balancer, monitoring and the app. */
export const healthResponseSchema = z.strictObject({
  status: z.literal("ok"),
  /** Deployed API version (from package.json), useful to trace incidents. */
  version: z.string().min(1),
  uptimeSeconds: z.number().nonnegative(),
  checkedAt: isoDateTimeSchema,
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
