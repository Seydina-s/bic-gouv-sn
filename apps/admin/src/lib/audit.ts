import { t } from "./i18n";

/** Journal action codes and their plain-French label. */
const LABELS = {
  "sign-in": "signIn",
  "sign-in.password-failed": "passwordFailed",
  "sign-in.code-failed": "codeFailed",
  "sign-in.locked": "locked",
  "sign-in.unknown-address": "unknownAddress",
  "sign-in.unknown-address-locked": "unknownAddressLocked",
  "account.created": "accountCreated",
  "account.activated": "accountActivated",
  "account.role-changed": "accountRoleChanged",
  "account.disabled": "accountDisabled",
  "account.enabled": "accountEnabled",
  "account.second-factor-reset": "accountSecondFactorReset",
  "account.activation-renewed": "accountActivationRenewed",
  "account.password-reset": "accountPasswordReset",
  "secret-key.rotated": "secretKeyRotated",
  "secrets.resealed": "secretsResealed",
  "procedure.theme.validated": "themeValidated",
  "service.verified": "serviceVerified",
  "service.rejected": "serviceRejected",
  "service.corrected": "serviceCorrected",
  "service.added": "serviceAdded",
  "remote-config.changed": "remoteChanged",
  "assistant.limit-changed": "assistantLimitChanged",
  "notification.prepared": "notificationPrepared",
  "notification.approved": "notificationApproved",
  "notification.cancelled": "notificationCancelled",
} as const;

function isKnown(action: string): action is keyof typeof LABELS {
  return Object.hasOwn(LABELS, action);
}

/** What was done, in plain French; an action not listed yet shows its code. */
export function auditActionLabel(action: string): string {
  return isKnown(action) ? t(`audit.actions.${LABELS[action]}`) : action;
}

/** Who did it: a name, "System", or "Removed account". */
export function auditActorLabel(actor: string, actorName: string | null): string {
  if (actorName !== null) {
    return actorName;
  }
  return actor === "system" ? t("audit.system") : t("audit.unknownPerson");
}
