import { isPublished, newsArticleSchema, type Lang, type NewsArticle } from "@bgs/shared-types";
import {
  compareNewestFirst,
  type ArticlePage,
  type ArticleRepository,
  type ListQuery,
  type SaveOutcome,
  type SectionPage,
  type SectionsQuery,
} from "./article-repository";
import { VersionedJsonStore } from "./versioned-json-store";

/**
 * Provisional article store: one JSON file (see VersionedJsonStore: validated reads,
 * durable writes with a backup copy, version history). Replaced by PostgreSQL behind
 * the same ArticleRepository interface. Single writer (the ingestion job).
 */
export class FileArticleRepository implements ArticleRepository {
  private readonly store: VersionedJsonStore<NewsArticle>;

  constructor(path: string) {
    this.store = new VersionedJsonStore(path, newsArticleSchema, "articles");
  }

  get(id: string): Promise<NewsArticle | null> {
    return this.store.get(id);
  }

  async list({
    lang,
    category,
    limit,
    cursor,
    offset = 0,
    includeWithdrawn = false,
  }: ListQuery): Promise<ArticlePage> {
    const all = (await this.newestFirst(lang, includeWithdrawn)).filter(
      (article) => category === undefined || article.category === category,
    );
    const start =
      cursor === undefined ? offset : all.findIndex((article) => article.id === cursor) + 1;
    const items = all.slice(start, start + limit);
    const last = items.at(-1);
    const hasMore = start + limit < all.length;
    return { items, nextCursor: hasMore && last !== undefined ? last.id : null, total: all.length };
  }

  async sections({ lang, perSection }: SectionsQuery): Promise<SectionPage[]> {
    const sections = new Map<string, SectionPage>();
    // Newest first overall, so sections come out ordered by their newest article.
    for (const article of await this.newestFirst(lang)) {
      const section = sections.get(article.category) ?? {
        category: article.category,
        items: [],
        total: 0,
      };
      section.total += 1;
      if (section.items.length < perSection) {
        section.items.push(article);
      }
      sections.set(article.category, section);
    }
    return [...sections.values()];
  }

  /** Articles with a version in `lang` (any language if undefined) the app may show. */
  private async newestFirst(
    lang: ListQuery["lang"],
    includeWithdrawn = false,
  ): Promise<NewsArticle[]> {
    const shown = (translation: NewsArticle["translations"][number]) =>
      (lang === undefined || translation.lang === lang) &&
      (includeWithdrawn || isPublished(translation));
    return Object.values(await this.store.entries())
      .map((entry) => entry.current)
      .filter((article) => article.translations.some(shown))
      .sort(compareNewestFirst);
  }

  history(id: string): Promise<NewsArticle[]> {
    return this.store.history(id);
  }

  save(article: NewsArticle): Promise<SaveOutcome> {
    return this.store.save(article);
  }

  /** Attaches processed images without creating a new content version. */
  setImages(id: string, images: NewsArticle["images"]): Promise<boolean> {
    return this.store.replaceCurrent(id, (current) =>
      newsArticleSchema.parse({ ...current, images }),
    );
  }

  setAttachments(id: string, attachments: NewsArticle["attachments"]): Promise<boolean> {
    return this.store.replaceCurrent(id, (current) =>
      newsArticleSchema.parse({ ...current, attachments }),
    );
  }

  /** A mark on the current version: its words stay as they are, no new version. */
  setWithdrawn(id: string, lang: Lang, withdrawnAt: string | null): Promise<boolean> {
    return this.store.replaceCurrent(id, (current) =>
      newsArticleSchema.parse({
        ...current,
        translations: current.translations.map((translation) => {
          if (translation.lang !== lang) {
            return translation;
          }
          const marked = { ...translation };
          delete marked.withdrawnAt;
          return withdrawnAt === null ? marked : { ...marked, withdrawnAt };
        }),
      }),
    );
  }
}
