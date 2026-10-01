"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS = {
  ADMIN_FORBIDDEN: "errors.editorsOnly",
  ERROR_GROUP_NOT_FOUND: "errors.gone",
} as const;

/** Marks an error group as fixed: it comes back to the list if it happens again. */
export async function resolveError(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: "/errors/resolved",
    method: "POST",
    token,
    body: { code: formText(form, "code"), where: formText(form, "where") },
    schema: z.null(),
  });
  if (!result.ok) {
    const key = Object.entries(REFUSALS).find(([code]) => code === result.code)?.[1];
    return { error: t(key ?? "errors.resolveFailed") };
  }
  revalidatePath("/erreurs");
  return { message: t("errors.resolvedDone") };
}
