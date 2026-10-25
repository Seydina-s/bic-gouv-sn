import {
  ASSISTANT_ANSWER_MAX,
  type AssistantFlag,
  type AssistantFlagRecheck,
  type AssistantSource,
} from "@bgs/shared-types";
import type { GroundedAnswer } from "./grounded-answer";

/*
 * The flagged questions asked again each week by the bench (AST-30g, owner's decision
 * of 19/10/2026: « versée chaque semaine au banc d'essai »). No right answer is known
 * for them, so they are not judged: the console shows what the assistant replies now
 * next to the flagged answer, to see whether a fix holds. They never join the known
 * weaknesses nor the run's file, both kept for good, while a flag is erased after
 * 90 days: a recheck is kept only for a flag still kept.
 */

export type FlagRechecks = Record<string, AssistantFlagRecheck>;

/** What the assistant replied to a flagged question asked again on `today`. */
export function flagRecheck(
  answer: GroundedAnswer,
  sources: readonly AssistantSource[],
  today: string,
): AssistantFlagRecheck {
  const text = answer.text?.trim() ?? "";
  return {
    askedOn: today,
    status: answer.status,
    answer: text === "" ? null : text.slice(0, ASSISTANT_ANSWER_MAX),
    sources: sources.slice(0, 8),
  };
}

/** Whether the assistant now replies otherwise than in the flagged answer. */
export function recheckChanged(flag: AssistantFlag, recheck: AssistantFlagRecheck): boolean {
  const pages = (sources: readonly { url: string }[]) =>
    [...new Set(sources.map(({ url }) => url))].sort().join("\n");
  return flag.status !== recheck.status || pages(flag.sources) !== pages(recheck.sources);
}

/**
 * The rechecks to keep after a run: this run's, else the last one of a flag the run
 * could not ask (the service did not reply); none for a flag no longer kept.
 */
export function nextRechecks(
  flags: readonly AssistantFlag[],
  previous: FlagRechecks,
  asked: ReadonlyMap<string, AssistantFlagRecheck | null>,
): FlagRechecks {
  return Object.fromEntries(
    flags.flatMap((flag) => {
      const recheck = asked.get(flag.id) ?? previous[flag.id];
      return recheck === undefined ? [] : [[flag.id, recheck]];
    }),
  );
}
