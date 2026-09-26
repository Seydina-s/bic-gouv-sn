// Garde-fou de langue (ERREURS.md, 25/09 et 26/09/2026) : l'utilisateur doit recevoir
// TOUS les messages en français. Trois usages, choisis par l'argument :
//   remind   : rappel ajouté à chaque message de l'utilisateur (UserPromptSubmit)
//   resume   : rappel renforcé au démarrage, à la reprise et après un résumé (SessionStart)
//   check    : avant la fin d'une réponse, bloque si le texte envoyé est en anglais (Stop)
// Aucune dépendance : lancé par Node.js directement.
import { readFileSync } from "node:fs";

const RULE =
  "RÈGLE ABSOLUE DU PROJET : tout texte visible par l'utilisateur est en FRANÇAIS " +
  "(réponses, points d'étape entre deux actions, questions à choix et leurs options, " +
  "descriptions des commandes). Seuls le code, les commits et les commentaires techniques " +
  "restent en anglais. Le résumé de session peut être en anglais : ne pas en reprendre la langue.";

const ENGLISH = new Set(
  ("the and is are was were with for this that these those to of in on it its it's i i'm " +
    "i'll you your we our will would have has had be been not what which here there done " +
    "next let me now from by as at into then so but if when because also just only " +
    "check checking running run adding fixing let's i've don't can't doesn't").split(" "),
);
const FRENCH = new Set(
  ("le la les et est sont avec pour ce cette ces que qui de des du un une je vous votre " +
    "vos dans sur pas plus ne en au aux il elle nous on mais car donc puis aussi " +
    "c'est j'ai je vais d'abord ensuite voici").split(" "),
);

/** Text without code, paths, links and identifiers: only the prose is judged. */
export function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\S*[\\/]\S*/g, " ");
}

/** True when the prose reads as English (enough words to judge, English clearly ahead). */
export function looksEnglish(text) {
  const words = prose(text)
    .toLowerCase()
    .match(/[a-zàâäçéèêëîïôöùûüÿœ']+/g) ?? [];
  let english = 0;
  let french = 0;
  for (const word of words) {
    if (ENGLISH.has(word)) english += 1;
    if (FRENCH.has(word)) french += 1;
  }
  return english >= 6 && english > french * 1.5;
}

/** Assistant prose written since the last message typed by the user. */
export function textOfCurrentTurn(transcriptLines) {
  const texts = [];
  for (const line of transcriptLines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry?.message?.content;
    if (entry?.type === "user" && typeof content === "string") {
      texts.length = 0; // a new message from the user starts a new turn
    } else if (entry?.type === "user" && Array.isArray(content) && content.some((c) => c?.type === "text")) {
      texts.length = 0;
    } else if (entry?.type === "assistant" && Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === "text" && typeof part.text === "string") texts.push(part.text);
        // Descriptions of commands are shown to the user too.
        if (part?.type === "tool_use" && typeof part.input?.description === "string") {
          texts.push(part.input.description);
        }
      }
    }
  }
  return texts;
}

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function main(mode) {
  const input = readInput();
  if (mode === "remind" || mode === "resume") {
    const context =
      mode === "resume"
        ? `${RULE} Premier message de cette reprise : en français, sans exception.`
        : RULE;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: mode === "resume" ? "SessionStart" : "UserPromptSubmit",
          additionalContext: context,
        },
      }),
    );
    return;
  }
  if (mode === "check") {
    // Second pass after a block: let the corrected answer through (no endless loop).
    if (input.stop_hook_active === true || typeof input.transcript_path !== "string") return;
    let lines;
    try {
      lines = readFileSync(input.transcript_path, "utf8").split("\n");
    } catch {
      return;
    }
    const english = textOfCurrentTurn(lines).filter(looksEnglish);
    if (english.length > 0) {
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason:
            `${RULE} Des textes de cette réponse sont en anglais (${english.length}). ` +
            "Écris maintenant, en français, le message final destiné à l'utilisateur, " +
            "en reprenant l'essentiel de ce qui a été dit en anglais.",
        }),
      );
    }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main(process.argv[2]);
}
