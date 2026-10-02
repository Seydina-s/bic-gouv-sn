/**
 * Key words of each official theme of e-senegal.sn (keyed by the source's theme
 * id). Written without accents, lower case; matched on whole words or word starts.
 * They only PROPOSE a theme: a person validates before anything is shown.
 */
import { foldForMatching } from "@bgs/shared-types";

export const THEME_KEYWORDS: Record<string, readonly string[]> = {
  // Citoyenneté, justice et sécurité
  "688d064649b595b42707a1f4": [
    "passeport",
    "carte nationale",
    "carte d identite",
    "nationalite",
    "casier judiciaire",
    "justice",
    "tribunal",
    "judiciaire",
    "police",
    "securite",
    "electeur",
    "electoral",
    "certificat de residence",
    "visa",
    "arme",
    "plainte",
    "refugie",
    "apatride",
  ],
  // Loisirs et sports
  "688d064649b595b42707a203": [
    "sport",
    "loisir",
    "piscine",
    "stade",
    "federation sportive",
    "chasse",
    "tourisme",
  ],
  // Transports
  "688d064649b595b42707a1f8": [
    "permis de conduire",
    "vehicule",
    "immatriculation",
    "carte grise",
    "transport",
    "auto ecole",
    "visite technique",
    "aviation",
    "aerien",
    "maritime",
    "navigation",
    "taxi",
    "conducteur",
    "moto",
  ],
  // Santé et protection sociale
  "688d064649b595b42707a1fd": [
    "sante",
    "medical",
    "medecin",
    "hopital",
    "pharmac",
    "vaccin",
    "maladie",
    "handicap",
    "protection sociale",
    "securite sociale",
    "ipres",
    "retraite",
    "pension",
    "mutuelle",
    "couverture maladie",
    "sanitaire",
  ],
  // Education et formation
  "688d064649b595b42707a201": [
    "ecole",
    "etudiant",
    "eleve",
    "bourse",
    "diplome",
    "baccalaureat",
    "bac",
    "examen",
    "universite",
    "formation",
    "enseignement",
    "scolaire",
    "equivalence",
    "bfem",
  ],
  // Famille, étapes de la vie et vie sociale
  "688d064649b595b42707a202": [
    "naissance",
    "mariage",
    "deces",
    "etat civil",
    "acte de",
    "divorce",
    "adoption",
    "filiation",
    "famille",
    "enfant",
    "succession",
    "heritage",
    "tutelle",
  ],
  // Emploi et travail
  "688d064649b595b42707a200": [
    "emploi",
    "travail",
    "chomage",
    "contrat de travail",
    "recrutement",
    "concours",
    "demandeur d emploi",
    "stage",
    "travailleur",
    "inspection du travail",
  ],
  // Habitat et logement
  "688d064649b595b42707a1f6": [
    "logement",
    "habitat",
    "construction",
    "permis de construire",
    "terrain",
    "foncier",
    "bail",
    "cadastre",
    "titre foncier",
    "lotissement",
    "urbanisme",
    "zac",
    "parcelle",
    "amenagement concerte",
  ],
  // Vie associative
  "688d064649b595b42707a204": ["association", "ong", "cooperative", "fondation", "benevol"],
  // Questions juridiques, administratives et fiscales
  "688d064649b595b42707a1ff": [
    "impot",
    "fiscal",
    "taxe",
    "tva",
    "patente",
    "douane",
    "quittance",
    "timbre",
    "legalisation",
    "notaire",
    "certificat de non",
    "attestation",
  ],
  // Vie de l'entreprise
  "688d064649b595b42707a1fe": [
    "entreprise",
    "societe",
    "registre du commerce",
    "rccm",
    "ninea",
    "gie",
    "commercant",
    "statuts",
    "creation d",
  ],
  // Culture et communication
  "688d064649b595b42707a1fb": [
    "culture",
    "presse",
    "media",
    "artiste",
    "droit d auteur",
    "cinema",
    "patrimoine",
    "musee",
    "audiovisuel",
    "radio",
    "television",
    "telecommunication",
    "journalist",
  ],
  // Activités de l'entreprise
  "688d064649b595b42707a1fa": [
    "agrement",
    "licence",
    "autorisation d exploit",
    "exportation",
    "importation",
    "marche public",
    "agricole",
    "peche",
    "minier",
    "mine",
    "industriel",
    "exploitation",
  ],
  // Ressources humaines
  "688d064649b595b42707a1f9": [
    "agent de l etat",
    "fonctionnaire",
    "fonction publique",
    "carriere",
    "avancement",
    "mutation",
    "conge",
    "solde",
    "ressources humaines",
    "personnel",
  ],
  // Finances
  "688d064649b595b42707a1f5": [
    "financement",
    "credit",
    "pret",
    "subvention",
    "fonds",
    "banque",
    "tresor",
    "paiement",
    "microfinance",
    "fongip",
    "der",
    "adepme",
  ],
};

/** Lower case, no accents, punctuation as spaces: "Crédit d'État" → "credit d etat". */
export function normalizeForMatch(text: string): string {
  return ` ${foldForMatching(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

function hits(text: string, keywords: readonly string[]): number {
  // A key word must start a word ("pret" matches "pret" and "prets", not "interpretation").
  return keywords.filter((keyword) => text.includes(` ${keyword}`)).length;
}

/**
 * The theme proposed for a procedure, or null when no theme clearly wins (the
 * procedure then waits in the "to classify" list for a person). Title words count
 * double: the title says what the procedure is.
 */
export function proposeTheme(
  procedure: { title: string; summary: string | null },
  keywords: Record<string, readonly string[]> = THEME_KEYWORDS,
): string | null {
  const title = normalizeForMatch(procedure.title);
  const summary = normalizeForMatch(procedure.summary ?? "");
  const scores = Object.entries(keywords)
    .map(([themeId, words]) => ({ themeId, score: 2 * hits(title, words) + hits(summary, words) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  if (best === undefined || second?.score === best.score) {
    return null;
  }
  return best.themeId;
}
