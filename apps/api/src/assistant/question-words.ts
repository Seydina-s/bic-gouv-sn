/*
 * Words people type that the search would miss (owner's report of 11/10/2026: "c ki
 * le premier ministre", "le DG du BIC Gouv" went unanswered): text-message shortcuts
 * and the acronyms of the institutions people use most. The question is widened with
 * the full words, never replaced: the model still reads it as typed. Acronyms the
 * articles write themselves (CEDEAO, PSE…) need no entry: they are found as written.
 */

const SHORTHANDS: Readonly<Record<string, string>> = {
  ki: "qui",
  koi: "quoi",
  kwa: "quoi",
  kom: "comment",
  komen: "comment",
  cmt: "comment",
  pk: "pourquoi",
  pq: "pourquoi",
  pr: "pour",
  pdt: "président",
  prez: "président",
  gvt: "gouvernement",
  gouv: "gouvernement",
  gouvt: "gouvernement",
  ajd: "aujourd'hui",
  auj: "aujourd'hui",
  mnt: "maintenant",
  dc: "donc",
  ds: "dans",
  tt: "tout",
  bcp: "beaucoup",
  pm: "premier ministre",
  cm: "conseil des ministres",
  dg: "directeur général",
  cni: "carte nationale d'identité",
  bic: "Bureau de l'Information et de la Communication du Gouvernement",
};

/** Lower case, without accents or apostrophes: how shortcuts are looked up. */
function words(question: string): string[] {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
}

/** The question, followed by the full words of the shortcuts it contains. */
export function widenQuestion(question: string): string {
  const added = [...new Set(words(question).flatMap((word) => SHORTHANDS[word] ?? []))];
  return added.length === 0 ? question : `${question} ${added.join(" ")}`;
}
