/**
 * A light French stemmer for the passage search, on words already folded (lower
 * case, no accents): plurals and the usual endings of verbs and feminine forms are
 * cut, so "divorcer" finds "divorce", "coute" finds "cout", "pieces" finds "piece".
 * Deliberately light: a few unrelated words meet ("porte", "port"), but no stem
 * loses its meaning. Numbers and short words are left as they are.
 */
export function frenchStem(word: string): string {
  if (word.length <= 3 || /\p{N}/u.test(word)) {
    return word;
  }
  const singular = /[sx]$/u.test(word) ? word.slice(0, -1) : word;
  if (singular.length > 5 && singular.endsWith("er")) {
    return singular.slice(0, -2);
  }
  if (singular.length > 4 && singular.endsWith("e")) {
    return singular.slice(0, -1);
  }
  return singular;
}
