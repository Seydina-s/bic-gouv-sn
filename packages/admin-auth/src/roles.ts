/**
 * Least privilege (CLAUDE.md §4.5): each role can do what the roles below it can,
 * plus its own tasks. Permissions are named by task, never checked by role name.
 */
export const ROLES = ["reviewer", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

const PERMISSIONS = {
  /** Read the dashboards, supervision and error journal. */
  "console.read": "reviewer",
  /** Validate or correct the theme proposed for a procedure. */
  "procedures.review": "reviewer",
  /** Validate machine translations. */
  "translations.review": "reviewer",
  /** Create and edit the services shown on the map. */
  "services.edit": "editor",
  /** Prepare a push notification (a national sending needs a second person). */
  "notifications.send": "editor",
  /** Feature flags, kill switch, minimum app version. */
  "flags.manage": "admin",
  /** Create accounts, change roles, reset a second factor. */
  "users.manage": "admin",
  /** Read the audit journal. */
  "audit.read": "admin",
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSIONS;

export function isRole(value: unknown): value is Role {
  return (ROLES as readonly unknown[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(PERMISSIONS[permission]);
}
