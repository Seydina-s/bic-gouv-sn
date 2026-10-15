import type { ArticleRepository, JsonDocument } from "@bgs/content-store";
import { createTranslator, fr } from "@bgs/i18n";
import {
  entreprendreDocumentSchema,
  isOfficialOpportunityUrl,
  type EntreprendreNews,
  publishedTranslation,
  type NewsArticle,
  type OpportunityDraft,
  type OpportunityKind,
} from "@bgs/shared-types";
import { excerptOf, htmlToBlocks } from "../news/html-to-blocks";
import { UNDATED_SHOWN_DAYS, type OpportunityService } from "./opportunities";

const t = createTranslator({ lang: "fr", reference: fr, catalog: fr });

/** Latest articles read on each pass: far more than a day of publications. */
const SCAN = 300;
/** Older announcements are not collected: their call is very likely closed. */
const COLLECT_DAYS = 120;
/** Without a closing date in the text, an announcement is collected this young only. */
const UNDATED_DAYS = UNDATED_SHOWN_DAYS;
const DAY_MS = 24 * 60 * 60 * 1000;
const SUMMARY_LENGTH = 600;
const TITLE_LENGTH = 200;

/**
 * What a title announces, in order: the first rule that matches wins. Strict on
 * purpose (a news story about a call is not the call): an opportunity missed is
 * better than a story shown as one.
 */
const KIND_RULES: readonly (readonly [OpportunityKind, RegExp])[] = [
  ["appel-offres", /\b(avis d.appel d.offres|appel d.offres|avis g[ée]n[ée]ral de passation)\b/iu],
  ["financement", /\bappel (à|a) (projets?|propositions)\b/iu],
  [
    "bourse",
    /\b(bourses?\b.{0,40}\b(campagne|d[ée]p[ôo]t|demandes?|candidatures?)|(campagne|d[ée]p[ôo]t|demandes?) de bourses?)/iu,
  ],
  [
    "concours",
    /\b(concours (direct|professionnel|d.entr[ée]e|de recrutement)|ouverture (du|des) concours)\b/iu,
  ],
  [
    "formation",
    /\bappel (à|a) candidatures?\b.{0,60}\bformation\b|\bformation\b.{0,60}\bappel (à|a) candidatures?\b/iu,
  ],
  ["candidature", /\b(appel (à|a) candidatures?|appel (à|a) manifestation d.int[ée]r[êe]t)\b/iu],
  ["emploi", /\b(avis de recrutement|avis de vacance|offres? d.emploi|recrute)\b/iu],
];

/** The kind of opportunity a title announces, or null when it announces none. */
export function opportunityKindOf(title: string): OpportunityKind | null {
  const plain = title.normalize("NFKC");
  return KIND_RULES.find(([, rule]) => rule.test(plain))?.[0] ?? null;
}

const MONTHS: Readonly<Record<string, number>> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

const CLOSING =
  /(date limite|au plus tard|jusqu.au|avant le|cl[ôo]tur\p{L}*|d[ée]lai de (d[ée]p[ôo]t|rigueur))[^.\n]{0,60}?\b(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})\b/iu;

/**
 * The closing date an official text writes out ("date limite : 30 octobre 2026"), as
 * YYYY-MM-DD, or null when it gives none clearly: never guessed.
 */
export function deadlineIn(text: string): string | null {
  const match = CLOSING.exec(text.normalize("NFKC"));
  if (match === null) {
    return null;
  }
  const [, , , day = "", monthWord = "", year = ""] = match;
  const month = MONTHS[monthWord.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()];
  if (month === undefined) {
    return null;
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** The day `days` before `now`, as YYYY-MM-DD. */
function dayBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The opportunity an official article announces, in its own words (title, first
 * words, link), or null when it announces none, is too old, or is already closed.
 */
export function opportunityFromArticle(article: NewsArticle, now: Date): OpportunityDraft | null {
  const translation = publishedTranslation(article, "fr");
  if (translation === undefined) {
    return null;
  }
  const blocks = htmlToBlocks(translation.bodyHtml);
  return announcedOpportunity(
    {
      title: translation.title,
      summary: excerptOf(blocks, SUMMARY_LENGTH),
      text: excerptOf(blocks, Number.MAX_SAFE_INTEGER),
      publishedOn: article.sourcePublishedOn,
      url: article.sourceUrl,
      organization: t(`institutions.${article.publisher}`),
    },
    now,
  );
}

/** The opportunity a news item of der.sn announces (DER-01), from its title and first words. */
export function opportunityFromDerNews(news: EntreprendreNews, now: Date): OpportunityDraft | null {
  return announcedOpportunity(
    {
      title: news.title,
      summary: news.excerpt,
      text: news.excerpt,
      publishedOn: news.publishedOn,
      url: news.sourceUrl,
      organization: t("opportunities.derOrganization"),
    },
    now,
  );
}

interface Announcement {
  title: string;
  /** Its first words, shown as they are. */
  summary: string;
  /** All the words read, where the closing date is looked for. */
  text: string;
  publishedOn: string | null;
  url: string;
  organization: string;
}

/** The common rules: an announcement clearly titled, recent, official, not closed. */
function announcedOpportunity(announcement: Announcement, now: Date): OpportunityDraft | null {
  const { publishedOn, url } = announcement;
  if (publishedOn === null || publishedOn < dayBefore(now, COLLECT_DAYS)) {
    return null;
  }
  const title = announcement.title.normalize("NFKC").trim();
  const kind = opportunityKindOf(title);
  if (kind === null || !isOfficialOpportunityUrl(url)) {
    return null;
  }
  const deadline = deadlineIn(announcement.text);
  const today = now.toISOString().slice(0, 10);
  const open = deadline === null ? publishedOn >= dayBefore(now, UNDATED_DAYS) : deadline >= today;
  if (!open) {
    return null;
  }
  return {
    kind,
    title: title.slice(0, TITLE_LENGTH),
    organization: announcement.organization,
    summary: announcement.summary.length >= 10 ? announcement.summary : title,
    deadline,
    officialUrl: url,
  };
}

export interface AutomaticOpportunitiesOptions {
  articles: ArticleRepository;
  /** The Entreprendre space (der.sn): the DER/FJ's calls are read in its news. */
  entreprendre?: JsonDocument;
  opportunities: OpportunityService;
  now?: () => Date;
}

/**
 * Feeds "Opportunités" from the official sites already collected (owner's request,
 * 14/10/2026): the calls, competitions, recruitments, grants and tenders they
 * announce are published on their own, once each (the official link is the key),
 * and the team can still withdraw one in the console.
 */
export class AutomaticOpportunities {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> = Promise.resolve();
  private readonly now: () => Date;

  constructor(private readonly options: AutomaticOpportunitiesOptions) {
    this.now = options.now ?? (() => new Date());
  }

  /** One pass: the opportunities published now. */
  async tick(): Promise<number> {
    const now = this.now();
    const { items } = await this.options.articles.list({ lang: "fr", limit: SCAN });
    const space = entreprendreDocumentSchema.safeParse(await this.options.entreprendre?.read());
    const drafts = [
      ...items.map((article) => opportunityFromArticle(article, now)),
      ...(space.success ? space.data.news : []).map((news) => opportunityFromDerNews(news, now)),
    ].filter((draft) => draft !== null);
    return (await this.options.opportunities.collect(drafts)).length;
  }

  /** A pass now, then every `intervalMs`, never two at once. */
  start(intervalMs: number, onError: (error: unknown) => void): void {
    const pass = () => {
      this.running = this.running.then(() => this.tick()).catch(onError);
    };
    pass();
    this.timer = setInterval(pass, intervalMs);
    this.timer.unref();
  }

  async close(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.running;
  }
}
