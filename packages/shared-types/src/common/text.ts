/**
 * Lower case without diacritics, for matching only, never shown: "Sénégal" and
 * "senegal" compare equal, and so do the Wolof letters and their plain forms
 * (ë → e, ñ → n, and ŋ → n, which Unicode does not decompose).
 */
export function foldForMatching(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[ŋŊ]/gu, "n").toLowerCase();
}
