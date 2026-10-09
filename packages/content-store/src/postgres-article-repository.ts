import type { Database } from "@bgs/database";
import { newsArticleSchema, shownLangs, type Lang, type NewsArticle } from "@bgs/shared-types";
import {
  withDuplicateOf,
  withTrack,
  type ArticlePage,
  type ArticleRepository,
  type ListQuery,
  type SaveOutcome,
  type SectionPage,
  type SectionsQuery,
} from "./article-repository";
import { PostgresVersionedTable } from "./postgres-versioned-table";
import type { VersionedEntry } from "./versioned-json-store";

/** compareNewestFirst, in SQL: newest publication day, then update time, then id. */
const NEWEST_FIRST = "published_on DESC, updated_at DESC, id";

/**
 * Articles in PostgreSQL (SCALE-02), behind the same interface as the file store:
 * lists, sections and pages are worked out by the database, so every API instance
 * serves the same articles and none reads the whole collection per request.
 */
export class PostgresArticleRepository implements ArticleRepository {
  private readonly table: PostgresVersionedTable<NewsArticle>;

  constructor(private readonly database: Database) {
    this.table = new PostgresVersionedTable(database, {
      table: "articles",
      historyTable: "article_history",
      schema: newsArticleSchema,
      columns: ["category", "published_on", "updated_at", "shown_langs", "all_langs"],
      values: (article) => [
        article.category,
        article.sourcePublishedOn ?? "",
        article.sourceUpdatedAt ?? "",
        shownLangs(article),
        article.translations.map((translation) => translation.lang),
      ],
    });
  }

  get(id: string): Promise<NewsArticle | null> {
    return this.table.get(id);
  }

  history(id: string): Promise<NewsArticle[]> {
    return this.table.history(id);
  }

  save(article: NewsArticle): Promise<SaveOutcome> {
    return this.table.save(article);
  }

  /** Copies an article and its history as they are (see PostgresVersionedTable). */
  importEntry(entry: VersionedEntry<NewsArticle>): Promise<"imported" | "present"> {
    return this.table.importEntry(entry);
  }

  async list({
    lang,
    category,
    limit,
    cursor,
    offset = 0,
    includeWithdrawn = false,
  }: ListQuery): Promise<ArticlePage> {
    const params: unknown[] = [];
    const where = [shownFilter(lang, includeWithdrawn, params)];
    if (category !== undefined) {
      params.push(category);
      where.push(`category = $${String(params.length)}`);
    }
    const matching = where.join(" AND ");
    const count = await this.database.query(
      `SELECT count(*)::int AS total FROM articles WHERE ${matching}`,
      params,
    );
    const total = (count.rows[0] as { total: number }).total;

    // A cursor is the last article of the previous page: the next page starts after
    // it in the list's order (an unknown cursor starts from the top, as in files).
    const after = cursor === undefined ? null : await this.positionOf(cursor);
    const pageParams = [...params];
    let keyset = "";
    if (after !== null) {
      pageParams.push(after.published_on, after.updated_at, after.id);
      const at = pageParams.length;
      const day = `$${String(at - 2)}`;
      const update = `$${String(at - 1)}`;
      const id = `$${String(at)}`;
      keyset = ` AND (published_on < ${day} OR (published_on = ${day} AND (updated_at < ${update}
        OR (updated_at = ${update} AND id > ${id}))))`;
    }
    pageParams.push(limit + 1, cursor === undefined ? offset : 0);
    const n = pageParams.length;
    const { rows } = await this.database.query(
      `SELECT data FROM articles WHERE ${matching}${keyset}
       ORDER BY ${NEWEST_FIRST} LIMIT $${String(n - 1)} OFFSET $${String(n)}`,
      pageParams,
    );
    const page = this.table.parse(rows);
    const items = page.slice(0, limit);
    const last = items.at(-1);
    const nextCursor = page.length > limit && last !== undefined ? last.id : null;
    return { items, nextCursor, total };
  }

  private async positionOf(
    id: string,
  ): Promise<{ published_on: string; updated_at: string; id: string } | null> {
    const { rows } = await this.database.query(
      "SELECT published_on, updated_at, id FROM articles WHERE id = $1",
      [id],
    );
    return (
      (rows[0] as { published_on: string; updated_at: string; id: string } | undefined) ?? null
    );
  }

  async sections({ lang, perSection }: SectionsQuery): Promise<SectionPage[]> {
    const params: unknown[] = [];
    const shown = shownFilter(lang, false, params);
    params.push(perSection);
    const { rows } = await this.database.query(
      `SELECT data, category, total FROM (
         SELECT data, category,
           row_number() OVER (PARTITION BY category ORDER BY ${NEWEST_FIRST}) AS rank,
           count(*) OVER (PARTITION BY category)::int AS total,
           min(overall) OVER (PARTITION BY category) AS first
         FROM (SELECT *, row_number() OVER (ORDER BY ${NEWEST_FIRST}) AS overall
               FROM articles WHERE ${shown}) AS shown
       ) AS ranked
       WHERE rank <= $${String(params.length)}
       ORDER BY first, rank`,
      params,
    );
    const sections = new Map<string, SectionPage>();
    for (const row of rows as { data: unknown; category: string; total: number }[]) {
      const section = sections.get(row.category) ?? {
        category: row.category,
        items: [],
        total: row.total,
      };
      section.items.push(...this.table.parse([row]));
      sections.set(row.category, section);
    }
    return [...sections.values()];
  }

  setImages(id: string, images: NewsArticle["images"]): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => ({ ...current, images }));
  }

  setAttachments(id: string, attachments: NewsArticle["attachments"]): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => ({ ...current, attachments }));
  }

  setAudioTrack(id: string, track: NewsArticle["audio"][number]): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => ({
      ...current,
      audio: withTrack(current.audio, track),
    }));
  }

  setDuplicateOf(id: string, referenceId: string | null): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => withDuplicateOf(current, referenceId));
  }

  setAlsoPublishedBy(id: string, others: NewsArticle["alsoPublishedBy"]): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => ({ ...current, alsoPublishedBy: others }));
  }

  /** A mark on the current version: its words stay as they are, no new version. */
  setWithdrawn(id: string, lang: Lang, withdrawnAt: string | null): Promise<boolean> {
    return this.table.replaceCurrent(id, (current) => ({
      ...current,
      translations: current.translations.map((translation) => {
        if (translation.lang !== lang) {
          return translation;
        }
        const marked = { ...translation };
        delete marked.withdrawnAt;
        return withdrawnAt === null ? marked : { ...marked, withdrawnAt };
      }),
    }));
  }
}

/** Articles with a version in `lang` (any language if undefined) the app may show. */
function shownFilter(lang: Lang | undefined, includeWithdrawn: boolean, params: unknown[]): string {
  const column = includeWithdrawn ? "all_langs" : "shown_langs";
  if (lang === undefined) {
    return `cardinality(${column}) > 0`;
  }
  params.push(lang);
  return `$${String(params.length)} = ANY(${column})`;
}
