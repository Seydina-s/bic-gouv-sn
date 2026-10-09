/*
 * Days written in French by the official sites, in full or abbreviated: "8 août 2026",
 * "1er octobre 2025", "30 sep 2026", "06 juin 2021". Anything else is not a date:
 * never guessed.
 */

const MONTHS: Readonly<Record<string, number>> = {
  janvier: 1,
  jan: 1,
  janv: 1,
  février: 2,
  fevrier: 2,
  fév: 2,
  févr: 2,
  fev: 2,
  mars: 3,
  mar: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  jun: 6,
  juillet: 7,
  juil: 7,
  jul: 7,
  août: 8,
  aout: 8,
  aoû: 8,
  aou: 8,
  septembre: 9,
  sept: 9,
  sep: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  décembre: 12,
  decembre: 12,
  déc: 12,
  dec: 12,
};

/** "8 août 2026" → "2026-08-08"; null for anything else. */
export function frenchDate(text: string): string | null {
  const match = /^(\d{1,2})(?:er)?\s+(\p{L}+)\.?,?\s+(\d{4})$/u.exec(text.trim());
  const month = MONTHS[match?.[2]?.toLowerCase() ?? ""];
  if (match === null || month === undefined) {
    return null;
  }
  const [day, year] = [Number(match[1]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}
