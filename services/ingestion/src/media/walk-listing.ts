import type { Lang } from "@bgs/shared-types";
import type { SourceArticleRef, SourceProvider } from "../sources/source-provider";

export interface ListingPosition {
  page: number;
  lastPage: number;
}

export interface WalkOptions {
  maxPages?: number;
  /** Called after each page, once its entries are visited. */
  onPage?: (position: ListingPosition) => void;
}

/**
 * Visits every entry of the source listing of one language, page after page (one
 * request per page, at the provider's polite pace). Entries are visited one at a
 * time: `visit` reports its own failures and must not throw.
 */
export async function walkListing(
  provider: SourceProvider,
  lang: Lang,
  visit: (ref: SourceArticleRef) => Promise<void>,
  { maxPages, onPage }: WalkOptions = {},
): Promise<ListingPosition> {
  const position: ListingPosition = { page: 0, lastPage: 1 };
  while (position.page < Math.min(position.lastPage, maxPages ?? Number.POSITIVE_INFINITY)) {
    const { refs, lastPage } = await provider.listPage(lang, position.page + 1);
    position.page += 1;
    position.lastPage = lastPage;
    for (const ref of refs) {
      await visit(ref);
    }
    onPage?.(position);
  }
  return position;
}
