// Run with: node --test .claude/hooks (also in pnpm check).
import assert from "node:assert/strict";
import { test } from "node:test";
import { refusal } from "./shell-guard.mjs";

const refused = [
  // Secrets files, accounts, keys (SEC-05).
  "cat apps/api/.env.local",
  "type apps\\api\\.env.local",
  "Get-Content .env",
  "grep ADMIN apps/api/.env.production",
  "cat .data/admin/accounts.json",
  "Get-Content .data\\admin\\accounts.json",
  "openssl x509 -in server.pem",
  // Push credentials (30/09/2026): Apple's key, Firebase's service account.
  "cat AuthKey_ABC123.p8",
  "Get-Content bic-gouv-sn-firebase-adminsdk-x1y2z.json",
  "cat google-service-account.json",
  // The environment printed.
  "printenv",
  "cd apps/api && env",
  "Get-ChildItem env:",
  "echo $env:ADMIN_SECRET_KEY",
  "echo $ADMIN_SECRET_KEY",
  "echo ${SENTRY_AUTH_TOKEN}",
  'node -e "console.log(process.env)"',
  "node -p process.env.ADMIN_SECRET_KEY",
  // The secret scanner showing what it finds.
  'gitleaks git --log-opts="-1"',
  "gitleaks dir . --redact",
  // Backticks the shell would run, and inline JavaScript holding one (29/09/2026).
  "echo `date`",
  'node -e "s.replace(\\`a\\`, \'b\')"',
];

const allowed = [
  "git status --short",
  "pnpm --filter @bgs/api start",
  "pnpm --filter @bgs/api admin:rotate-key",
  "cat apps/api/.env.example",
  // Public identifiers only (Firebase's own guidance).
  "cat apps/mobile/google-services.json",
  'grep -rn "process.env.EXPO_PUBLIC_API_URL" apps/mobile/src',
  'gitleaks git --redact --log-opts="-1"',
  "Get-NetTCPConnection -LocalPort 3100 -State Listen",
  "node scripts/e2e.ts",
  "curl -s http://127.0.0.1:3100/v1/health",
  // A text that names a secrets file goes in a quoted heredoc: never read by the shell.
  "git commit -q -F - <<'EOF'\ndocs: never print .env.local values\nEOF",
  "cat <<'EOF'\n`fine` and cat .env.local in a text\nEOF",
];

test("refuses every command that could show a secret or run text", () => {
  for (const command of refused) {
    assert.notEqual(refusal(command), null, command);
  }
});

test("lets ordinary work through", () => {
  for (const command of allowed) {
    assert.equal(refusal(command), null, command);
  }
});
