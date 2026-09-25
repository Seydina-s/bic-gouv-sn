import { createHash } from "node:crypto";

/** RFC 4122 URL namespace, used to derive stable UUIDs from source identities. */
const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

/**
 * Deterministic UUID v5: the same source item always gets the same id, so running
 * a collection twice never creates duplicates (idempotency, CLAUDE.md §4.4).
 */
export function stableUuid(name: string, namespaceUuid: string = URL_NAMESPACE): string {
  const namespace = Buffer.from(namespaceUuid.replaceAll("-", ""), "hex");
  const bytes = createHash("sha1").update(namespace).update(name, "utf8").digest().subarray(0, 16);
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x50, 6); // version 5
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8); // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** SHA-256 of a value's canonical JSON, to detect content changes between collections. */
export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
