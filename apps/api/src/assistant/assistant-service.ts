import type {
  AssistantQuestion,
  AssistantReply,
  AssistantSource,
  AssistantUsage,
} from "@bgs/shared-types";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { SettingStore } from "../admin/setting-store";
import type { KeyValueStore } from "../shared-state/key-value-store";
import { answerQuestion, type AnswerDependencies, type GroundedAnswer } from "./grounded-answer";
import type { KnowledgeSource } from "./knowledge";
import type { LlmProvider } from "./llm-provider";
import type { Passage } from "./passages";

/*
 * The assistant as the app and the console see it (owner's decision of 07/10/2026):
 * at most a set number of questions a month (10 000 by default, changed in the
 * console), counted when the model is called, for every API instance together.
 * Past the limit, the person is told kindly that it answers again next month.
 * Without a model (no key yet) or when the model fails, the app stays usable and
 * says the assistant is unavailable.
 */

export const DEFAULT_MONTHLY_LIMIT = 10_000;
const SETTING_KEY = "assistant";
/** Counters outlive their month by a day: the last answers of the month are counted. */
const COUNTER_MARGIN_MS = 24 * 60 * 60_000;

const settingSchema = z.object({
  monthlyLimit: z.int().positive(),
  changedBy: z.string(),
  changedAt: z.string(),
});

/** Why a reply is not an answer, for the error journal; null when all went well. */
export type AssistantProblem = "model_failed" | "answer_rejected" | "quota_reached" | null;

export interface AssistantOutcome {
  reply: AssistantReply;
  problem: AssistantProblem;
}

/** The month's questions are used up: the model was not called. */
class QuotaReached extends Error {}

/** "2026-10" in Dakar, which is on UTC all year. */
export function monthOf(time: number): string {
  return new Date(time).toISOString().slice(0, 7);
}

/** First day of the next month ("2026-11-01"), at midnight UTC as a time. */
function nextMonthStart(time: number): number {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function reply(status: AssistantReply["status"], resumesOn: string | null = null): AssistantReply {
  return { status, text: null, sources: [], resumesOn };
}

export interface AssistantServiceOptions {
  /** None while no model is configured: the assistant says it is unavailable. */
  llm: LlmProvider | null;
  knowledge: KnowledgeSource;
  state: KeyValueStore;
  settings: SettingStore;
  journal: AuditJournal | null;
  /** Deadline and circuit breaker of the model calls. */
  call: AnswerDependencies["call"];
  now?: () => number;
}

export class AssistantService {
  private readonly now: () => number;

  constructor(private readonly options: AssistantServiceOptions) {
    this.now = options.now ?? Date.now;
  }

  get configured(): boolean {
    return this.options.llm !== null;
  }

  async monthlyLimit(): Promise<number> {
    const saved = settingSchema.safeParse(await this.options.settings.get(SETTING_KEY));
    return saved.success ? saved.data.monthlyLimit : DEFAULT_MONTHLY_LIMIT;
  }

  private counter(name: string, time: number): string {
    return `assistant:${name}:${monthOf(time)}`;
  }

  private async count(name: string, time: number): Promise<number> {
    return Number(await this.options.state.get(this.counter(name, time))) || 0;
  }

  private add(name: string, time: number, by: number): Promise<number> {
    const ttlMs = nextMonthStart(time) - time + COUNTER_MARGIN_MS;
    return this.options.state.increment(this.counter(name, time), ttlMs, by);
  }

  async answer(question: AssistantQuestion): Promise<AssistantOutcome> {
    const { llm } = this.options;
    if (llm === null) {
      return { reply: reply("unavailable"), problem: null };
    }
    const time = this.now();
    const paused = {
      reply: reply("paused", new Date(nextMonthStart(time)).toISOString().slice(0, 10)),
      problem: "quota_reached" as const,
    };
    const limit = await this.monthlyLimit();
    if ((await this.count("questions", time)) >= limit) {
      return paused;
    }
    const knowledge = await this.options.knowledge.read();
    let answer: GroundedAnswer;
    try {
      answer = await answerQuestion(question, {
        index: knowledge.index,
        llm,
        // Counted just before the model is called: atomic across instances, so
        // the limit holds even when many people ask at the same moment.
        call: async (operation) => {
          if ((await this.add("questions", time, 1)) > limit) {
            throw new QuotaReached();
          }
          return this.options.call(operation);
        },
      });
    } catch (error) {
      if (error instanceof QuotaReached) {
        return paused;
      }
      return { reply: reply("unavailable"), problem: "model_failed" };
    }
    if (answer.usage !== null) {
      await Promise.all([
        this.add("input-tokens", time, answer.usage.inputTokens),
        this.add("output-tokens", time, answer.usage.outputTokens),
      ]);
    }
    return {
      reply: {
        status: answer.status,
        text: answer.text,
        sources: sourcesOf(answer.sources, knowledge.procedureSlugs),
        resumesOn: null,
      },
      problem: answer.rejected === null ? null : "answer_rejected",
    };
  }

  async usage(): Promise<AssistantUsage> {
    const time = this.now();
    const [questions, inputTokens, outputTokens, monthlyLimit] = await Promise.all([
      this.count("questions", time),
      this.count("input-tokens", time),
      this.count("output-tokens", time),
      this.monthlyLimit(),
    ]);
    return {
      month: monthOf(time),
      // Refused questions past the limit are counted too: never shown above it.
      questions: Math.min(questions, monthlyLimit),
      monthlyLimit,
      inputTokens,
      outputTokens,
      configured: this.configured,
    };
  }

  /** Changed in the console by an administrator; written to the audit journal. */
  async setMonthlyLimit(monthlyLimit: number, actor: string): Promise<AssistantUsage> {
    const at = new Date(this.now()).toISOString();
    const previous = await this.monthlyLimit();
    await this.options.settings.set(SETTING_KEY, { monthlyLimit, changedBy: actor, changedAt: at });
    await this.options.journal?.append({
      at,
      actor,
      action: "assistant.limit-changed",
      target: null,
      details: { from: previous, to: monthlyLimit },
    });
    return this.usage();
  }
}

/** One source per official page, in the order first cited. */
function sourcesOf(
  passages: readonly Passage[],
  procedureSlugs: ReadonlyMap<string, string>,
): AssistantSource[] {
  const seen = new Set<string>();
  return passages.flatMap((passage) => {
    if (seen.has(passage.contentId)) {
      return [];
    }
    seen.add(passage.contentId);
    return [
      {
        kind: passage.kind,
        contentId: passage.contentId,
        slug: passage.kind === "procedure" ? (procedureSlugs.get(passage.contentId) ?? null) : null,
        title: passage.title,
        url: passage.sourceUrl,
        publishedOn: passage.publishedOn,
      },
    ];
  });
}
