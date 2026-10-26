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

/**
 * Everyday words, and the words the official sheets use for them (bench of
 * 17/10/2026: "protéger le design de mon produit" never found the sheet on
 * "dessins et modèles industriels", nor "devenir soldat" the one on "carrière
 * militaire"). Each failure the bench finds on such a word adds an entry here.
 */
const OFFICIAL_WORDS: Readonly<Record<string, string>> = {
  design: "dessin modèle industriel",
  soldat: "carrière militaire armée",
  militaire: "carrière militaire",
  heritage: "succession",
  divorce: "divorce séparation de corps",
  divorcee: "divorce séparation de corps",
  boutique: "commerce",
  logo: "marque",
  brevet: "brevet d'invention",
  papiers: "pièces à fournir",
  loyer: "bail",
  handicap: "carte d'égalité des chances",
  handicape: "carte d'égalité des chances",
  // Bench of 25/10/2026: the sheets on the national identity card, the grants and the
  // digitised passport were never given for these words.
  identite: "carte nationale d'identité",
  universite: "bourse d'études supérieures",
  etudiant: "bourse d'études supérieures",
  passeport: "passeport numérisé",
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

/**
 * Everyday words that, alone, ask about a procedure ("Quelle carte pour les personnes
 * vivant avec un handicap ?" was given Council communiqués, never the sheet, bench of
 * 25/10/2026). Words also common in the news ("militaire", "brevet") are left out: the
 * Prytanée's article title was then given the sheet on its entrance exam.
 */
const PROCEDURE_WORDS: ReadonlySet<string> = new Set([
  "handicap",
  "handicape",
  "identite",
  "passeport",
  "divorce",
  "divorcee",
  "heritage",
  "papiers",
]);

/** Whether the question uses an everyday word that asks about a procedure. */
export function namesSheetWords(question: string): boolean {
  return words(question).some((word) => PROCEDURE_WORDS.has(word));
}

/** The question, followed by the full words of its shortcuts and the official words of its everyday ones. */
export function widenQuestion(question: string): string {
  const added = [
    ...new Set(
      words(question).flatMap((word) =>
        [SHORTHANDS[word] ?? [], OFFICIAL_WORDS[word] ?? []].flat(),
      ),
    ),
  ];
  return added.length === 0 ? question : `${question} ${added.join(" ")}`;
}
