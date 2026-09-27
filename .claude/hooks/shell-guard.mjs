// PreToolUse guard for Bash commands (ERREURS.md, 24/09 → 27/09/2026): a backtick
// outside single quotes or a quoted heredoc is command substitution, and it has
// already run text as a command several times. Such a command is refused (exit 2)
// with a message telling how to write the text instead.
import { readFileSync } from "node:fs";

/** The command without the bodies of quoted heredocs, which the shell never interprets. */
function withoutQuotedHeredocs(command) {
  return command.replace(/<<-?\s*(['"])(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "");
}

/**
 * True when a backtick is read by the shell: outside single quotes (inside double
 * quotes it still substitutes; single quotes inside double quotes protect nothing).
 */
export function hasSubstitution(command) {
  let state = "none";
  const text = withoutQuotedHeredocs(command);
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (state === "single") {
      if (char === "'") state = "none";
    } else if (char === "\\") {
      index += 1;
    } else if (char === "`") {
      return true;
    } else if (state === "double") {
      if (char === '"') state = "none";
    } else if (char === "'") {
      state = "single";
    } else if (char === '"') {
      state = "double";
    }
  }
  return false;
}

export function refusal(command) {
  if (!hasSubstitution(command)) {
    return null;
  }
  return (
    "Commande refusée : accent grave hors d'apostrophes ou d'un texte <<'EOF' (le shell l'exécuterait comme une commande). " +
    "Écrire le texte avec l'outil d'écriture ou d'édition de fichiers, ou utiliser $(...) si une substitution est voulue."
  );
}

if (process.argv[1]?.endsWith("shell-guard.mjs")) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const command = input?.tool_input?.command;
  const message = typeof command === "string" ? refusal(command) : null;
  if (message !== null) {
    process.stderr.write(message);
    process.exit(2);
  }
  process.exit(0);
}
