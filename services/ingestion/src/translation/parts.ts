import type { BatchResult } from "./claude-batches";

/*
 * An item too long for one reply is sent in parts, "<id>_part0", "<id>_part1"… (ML-12c,
 * 17/10/2026: four Wolof articles of up to 117 000 characters could not fit in one
 * reply). Its replies are joined back into one, in order, before any check: the
 * whole is checked as if it had come in one piece, and nothing is saved when a part
 * failed or was cut short.
 */

// The provider takes letters, digits, "-" and "_" only in an id: "#" would refuse the batch.
const PART = "_part";

/** The id a request is sent under: the item's own when it goes in one piece. */
export function partId(id: string, part: number, parts: number): string {
  return parts === 1 ? id : `${id}${PART}${String(part)}`;
}

function split(customId: string): { id: string; part: number | null } {
  const at = customId.lastIndexOf(PART);
  const part = at < 0 ? Number.NaN : Number(customId.slice(at + PART.length));
  return Number.isInteger(part)
    ? { id: customId.slice(0, at), part }
    : { id: customId, part: null };
}

/**
 * The results with each item's parts joined into one result under the item's id, in
 * the order of the parts. `merge` joins the texts of the parts; null when it cannot.
 */
export function joinParts(
  results: readonly BatchResult[],
  merge: (texts: readonly string[]) => string | null,
): BatchResult[] {
  const whole: BatchResult[] = [];
  const parted = new Map<string, { part: number; result: BatchResult }[]>();
  for (const result of results) {
    const { id, part } = split(result.customId);
    if (part === null) {
      whole.push(result);
    } else {
      parted.set(id, [...(parted.get(id) ?? []), { part, result }]);
    }
  }
  for (const [id, parts] of parted) {
    const ordered = parts.sort((a, b) => a.part - b.part).map(({ result }) => result);
    const failed = ordered.flatMap((result) => (result.ok ? [] : [result]))[0];
    if (failed !== undefined) {
      whole.push({ customId: id, ok: false, reason: failed.reason });
      continue;
    }
    const replies = ordered.flatMap((result) => (result.ok ? [result] : []));
    whole.push({
      customId: id,
      ok: true,
      text: merge(replies.map((reply) => reply.text)) ?? "",
      inputTokens: replies.reduce((sum, reply) => sum + reply.inputTokens, 0),
      outputTokens: replies.reduce((sum, reply) => sum + reply.outputTokens, 0),
      truncated: replies.some((reply) => reply.truncated),
    });
  }
  return whole;
}
