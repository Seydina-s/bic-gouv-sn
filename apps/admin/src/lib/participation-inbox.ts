import { participationResponseSchema, type ParticipationEntry } from "@bgs/shared-types";
import { adminRequest } from "./admin-api";

/** The inbox of "Participer", read through the API; null when it cannot be read. */
export async function participationInbox(
  token: string,
): Promise<readonly ParticipationEntry[] | null> {
  const answer = await adminRequest({
    path: "/participation",
    token,
    schema: participationResponseSchema,
  });
  return answer.ok ? answer.data.entries : null;
}
