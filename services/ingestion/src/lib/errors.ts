import type { ErrorCode } from "@bgs/shared-types";

/** The source returned something that does not match what we expect: never published. */
export class QuarantineError extends Error {
  readonly code: ErrorCode = "INGESTION_QUARANTINED";

  constructor(
    readonly sourceRef: string,
    readonly reason: string,
  ) {
    super(`Quarantined ${sourceRef}: ${reason}`);
    this.name = "QuarantineError";
  }
}

/** The source could not be reached (network, HTTP error, timeout). */
export class SourceUnreachableError extends Error {
  readonly code: ErrorCode = "INGESTION_SOURCE_UNREACHABLE";

  constructor(
    readonly url: string,
    readonly status: number | null,
  ) {
    super(`Source unreachable: ${url}${status === null ? "" : ` (HTTP ${String(status)})`}`);
    this.name = "SourceUnreachableError";
  }
}
