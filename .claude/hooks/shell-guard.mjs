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

/**
 * True when JavaScript given on the command line holds a backtick, even escaped:
 * template strings through the shell's quoting broke files twice (ERREURS.md,
 * 29/09/2026). Such code belongs in a file written with the editor.
 */
export function hasInlineTemplate(command) {
  const text = withoutQuotedHeredocs(command);
  return /\bnode(\.exe)?\s+(-e|--eval|-p|--print)\b/.test(text) && text.includes("`");
}

/**
 * Ways a command could show a secret (SEC-05, decision of 29/09/2026): reading a
 * secrets file, printing the environment, or running the secret scanner without
 * masking what it finds. The API reads its own .env.local when it starts
 * (package scripts), so nothing legitimate needs these in a typed command.
 */
const SECRET_ACCESS = [
  // Env files holding real values (the committed .env.example is documentation).
  /(^|[\s"'=/\\])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s"';|&)])/,
  // Accounts (password hashes, sealed second factors) and key files.
  /\.data[/\\]admin\b/,
  /\w\.(pem|p12|pfx|key)(?=$|[\s"';|&])/,
  // The environment printed whole, or a secret variable by name.
  /(^|[;&|]\s*)(printenv|env|set|export\s+-p)\s*($|[;&|])/,
  /\b(Get-ChildItem|gci|dir|ls)\s+env:|\$env:[A-Z_]*(SECRET|TOKEN|KEY|PASSWORD|DSN)/i,
  /\$\{?[A-Z_]*(SECRET|TOKEN|PASSWORD)[A-Z_]*\}?/,
  // JavaScript run from the command line that reads the environment.
  /\b(node|tsx)(\.exe)?\s+(-e|-p|--eval|--print)\b[\s\S]*process\.env/,
];

/** True when the command could show a secret; the secret scanner must mask (--redact). */
export function touchesSecrets(command) {
  const text = withoutQuotedHeredocs(command);
  if (/\bgitleaks(\.exe)?\b/.test(text) && (!text.includes("--redact") || /\bgitleaks(\.exe)?\s+dir\b/.test(text))) {
    return true;
  }
  return SECRET_ACCESS.some((pattern) => pattern.test(text));
}

export function refusal(command) {
  if (touchesSecrets(command)) {
    return (
      "Commande refusée : elle pourrait afficher un secret (fichier .env, comptes, clé, variables d'environnement, " +
      "ou gitleaks sans --redact / en mode dir). Les secrets ne se lisent jamais, ni dans le terminal ni dans la conversation " +
      "(SEC-05). Utiliser les commandes prévues (pnpm --filter @bgs/api admin:rotate-key, gitleaks git --redact)."
    );
  }
  if (hasInlineTemplate(command)) {
    return (
      "Commande refusée : du JavaScript passé à « node -e » contient un accent grave (même échappé). " +
      "Écrire ce code avec l'outil d'édition de fichiers, directement dans le fichier visé."
    );
  }
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
