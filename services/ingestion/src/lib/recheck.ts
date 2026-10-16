import type { WithdrawalCheck } from "../sources/source-provider";
import { QuarantineError, SourceUnreachableError } from "./errors";
import type { PoliteHttp } from "./polite-http";

/** Answers that mean the page is gone for good, not a passing failure. */
const GONE = new Set([404, 410]);

function checkOfFailure(error: unknown): WithdrawalCheck {
  if (error instanceof SourceUnreachableError && error.status !== null && GONE.has(error.status)) {
    return "withdrawn";
  }
  // Sites with an API flag an unpublished article (presidence.sn, mctn.sn).
  if (error instanceof QuarantineError && error.reason.includes("not published")) {
    return "withdrawn";
  }
  return "unconfirmed";
}

/**
 * Runs `read`, which resolves to whether the article is still published. A passing
 * failure (network, server error, unexpected page) is "unconfirmed": it never hides.
 */
export async function recheckWith(read: () => Promise<boolean>): Promise<WithdrawalCheck> {
  try {
    return (await read()) ? "still-published" : "withdrawn";
  } catch (error) {
    return checkOfFailure(error);
  }
}

/**
 * Reads an article's official page again, for sites that answer 404 to an address
 * they do not know (checked site by site on 16/10/2026, docs/sources.md).
 */
export function recheckPage(http: PoliteHttp, url: string): Promise<WithdrawalCheck> {
  return recheckWith(() =>
    http.read(
      url,
      async (response) => {
        // Only the answer matters: the page itself is not downloaded.
        await response.body?.cancel();
        return true;
      },
      { Accept: "text/html" },
    ),
  );
}

/** The last segment of an article's official address: how most sites name it. */
export function lastSegmentOf(sourceUrl: string): string {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments.at(-1) ?? "");
}
