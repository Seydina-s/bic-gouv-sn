import { newsArticleSchema, type NewsArticle } from "@bgs/shared-types";
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

  async list({ lang, category, limit, cursor, offset = 0 }: ListQuery): Promise<ArticlePage> {
    const all = (await this.newestFirst(lang)).filter(
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

  private async newestFirst(lang: ListQuery["lang"]): Promise<NewsArticle[]> {
    return Object.values(await this.store.entries())
      .map((entry) => entry.current)
      .filter((article) => lang === undefined || article.translations.some((t) => t.lang === lang))
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
}
