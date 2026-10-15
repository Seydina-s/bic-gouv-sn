/*
 * The Government as the Primature publishes it, read on its page on 15/10/2026
 * (https://primature.sn/le-gouvernement). Several ministries have no site of their
 * own (Communication, Microfinance…): their news is in the Conseil des ministres
 * communiqués and the other institutions' articles, which name the minister. A
 * question naming a portfolio therefore also looks for its minister (AST-27, owner's
 * report of 14/10: "dernières activités du ministère de la Communication").
 * When the Government changes, this list is read again from that page.
 */

export const GOVERNMENT_SOURCE = {
  url: "https://primature.sn/le-gouvernement",
  readOn: "2026-10-15",
} as const;

export interface GovernmentMember {
  /** As the page writes it. */
  name: string;
  /** The post, as the page writes it. */
  post: string;
  /** Words naming the portfolio in a question, folded (no accents, lower case, spaced). */
  cues: readonly string[];
}

export const GOVERNMENT: readonly GovernmentMember[] = [
  {
    name: "Ahmadou Alhaminou Mohamed LO",
    post: "Premier Ministre",
    cues: [" premier ministre "],
  },
  {
    name: "Papa Assane TOURE",
    post: "Ministre, Secrétaire général du Gouvernement",
    cues: [" secretaire general du gouvernement ", " sgg "],
  },
  { name: "Yankoba DIEME", post: "Ministre des Forces Armées", cues: [" forces armees "] },
  {
    name: "Cheikh DIBA",
    post: "Ministre de l’Economie, des Finances et du Plan",
    cues: [" economie ", " finances "],
  },
  {
    name: "Mouhamadou Makhtar CISSE",
    post: "Ministre de l’Intérieur et de la Sécurité publique",
    cues: [" interieur ", " securite publique "],
  },
  {
    name: "Cheikh NIANG",
    post: "Ministre de l’Intégration Africaine, des Affaires étrangères et des Sénégalais de l’Extérieur",
    cues: [" affaires etrangeres ", " integration africaine ", " senegalais de l exterieur "],
  },
  {
    name: "Moussa SARR",
    post: "Ministre de la Justice, Garde des Sceaux",
    cues: [" justice ", " garde des sceaux "],
  },
  {
    name: "Marie Angélique Mame Selbé DIOUF",
    post: "Ministre de la Famille, de l’Action sociale et des Solidarités",
    cues: [" famille ", " action sociale ", " solidarites "],
  },
  {
    name: "Boubacar CAMARA",
    post: "Ministre de l’Enseignement supérieur, de la Recherche et de l’Innovation",
    cues: [" enseignement superieur ", " recherche ", " innovation "],
  },
  {
    name: "El Hadji Abdourahmane DIOUF",
    post: "Ministre de l’Energie et du Pétrole",
    cues: [" energie ", " petrole "],
  },
  {
    name: "Serigne Guèye DIOP",
    post: "Ministre de l’Industrie et du Commerce",
    cues: [" industrie ", " commerce "],
  },
  {
    name: "Cheikh Tidiane DIEYE",
    post: "Ministre de l’Hydraulique et de l’Assainissement",
    cues: [" hydraulique ", " assainissement "],
  },
  {
    name: "Moustapha Mamba GUIRASSY",
    post: "Ministre de l’Éducation Nationale",
    cues: [" education nationale ", " education "],
  },
  {
    name: "Ibrahima SY",
    post: "Ministre de la Santé et de l’Hygiène Publique",
    cues: [" sante ", " hygiene publique "],
  },
  {
    name: "Moussa Bala FOFANA",
    post: "Ministre de l’Urbanisme, des Collectivités Territoriales et de l’Aménagement des Territoires",
    cues: [" urbanisme ", " collectivites territoriales ", " amenagement des territoires "],
  },
  { name: "Déthié FALL", post: "Ministre des Infrastructures", cues: [" infrastructures "] },
  {
    name: "Bacary SARR",
    post: "Ministre de la Communication et des Relations avec les Institutions, Porte-Parole du Gouvernement",
    cues: [" communication ", " relations avec les institutions ", " porte parole "],
  },
  {
    name: "Alioune DIONE",
    post: "Ministre de la Microfinance et de l’Economie Sociale et Solidaire",
    cues: [" microfinance ", " economie sociale et solidaire "],
  },
  {
    name: "Cheikhou Oumar BA",
    post: "Ministre de l’Agriculture, de la Souveraineté Alimentaire et de l’Elevage",
    cues: [" agriculture ", " souverainete alimentaire "],
  },
  {
    name: "Samba DIOUF",
    post: "Ministre des Télécommunications et du Numérique",
    cues: [" telecommunications ", " numerique "],
  },
  {
    name: "Mamadou Lamine DIANTE",
    post: "Ministre de la Fonction Publique, du Travail et de la Réforme du Service Public",
    cues: [" fonction publique ", " travail ", " reforme du service public "],
  },
  {
    name: "Djirèye Clotilde COLY",
    post: "Ministre de la Jeunesse et des Sports",
    cues: [" jeunesse ", " sports ", " sport "],
  },
  {
    name: "Alpha THIAM",
    post: "Ministre de la Culture, de l’Artisanat et du Tourisme",
    cues: [" culture ", " artisanat ", " tourisme "],
  },
  {
    name: "Idrissa SAMB",
    post: "Ministre de l’Emploi et de la Formation Professionnelle et Technique",
    cues: [" emploi ", " formation professionnelle "],
  },
  {
    name: "Cheikhou Oumar SECK",
    post: "Ministre des Mines et de la Géologie",
    cues: [" mines ", " geologie "],
  },
  {
    name: "Aliou Gori DIOUF",
    post: "Ministre de l’Environnement et de la Transition Ecologique",
    cues: [" environnement ", " transition ecologique "],
  },
  {
    name: "Abdoul Ahad NDIAYE",
    post: "Ministre des Transports terrestres et aériens",
    cues: [" transports ", " transport "],
  },
  {
    name: "Amy MARA",
    post: "Ministre des Pêches et de l’Economie maritime",
    cues: [" peche ", " peches ", " economie maritime "],
  },
  {
    name: "Bassirou SARR",
    post: "Ministre auprès du Ministre de l’Economie, des Finances et du Plan, chargé du Budget",
    cues: [" budget "],
  },
  {
    name: "Allé Nar DIOP",
    post: "Ministre auprès du Ministre de l’Economie, des Finances et du Plan, chargé de l’Economie, du Plan et de la Coopération",
    cues: [" plan ", " cooperation "],
  },
  {
    name: "Ousmane DIAGNE",
    post: "Ministre auprès du Ministre de l’Agriculture, de la Souveraineté alimentaire et de l’Elevage, chargé de l’Elevage",
    cues: [" elevage "],
  },
  {
    name: "Mame Coumba DIOP",
    post: "Ministre auprès du Ministre de la Culture, de l’Artisanat et du Tourisme, chargé de la Culture, des Industries créatives et du Patrimoine historique",
    cues: [" culture ", " industries creatives ", " patrimoine historique "],
  },
];

/**
 * The members whose portfolio a folded question names. A portfolio is named only
 * with "ministre" or "ministère" ("la justice sociale" is not the ministry); the
 * spokesperson and the two posts named in full need no such word.
 */
export function membersNamed(foldedQuestion: string): GovernmentMember[] {
  const ministry = foldedQuestion.includes(" minist");
  return GOVERNMENT.filter((member) =>
    member.cues.some(
      (cue) =>
        foldedQuestion.includes(cue) &&
        (ministry ||
          cue === " porte parole " ||
          cue === " premier ministre " ||
          cue === " secretaire general du gouvernement "),
    ),
  );
}
