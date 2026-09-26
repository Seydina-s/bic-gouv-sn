"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formText, formTexts } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export interface ReviewState {
  message?: string;
  error?: string;
}

/**
 * A person files procedures under a theme: the checked proposals of a theme, or
 * one procedure moved to another theme. Recorded in the audit journal by the API.
 */
export async function fileUnderTheme(_previous: ReviewState, form: FormData): Promise<ReviewState> {
  const { token } = await requireAccount();
  const themeId = formText(form, "themeId");
  const themeTitle = formText(form, "themeTitle");
  const slugs = formTexts(form, "slug");
  if (slugs.length === 0 || themeId === "") {
    return {};
  }
  const result = await adminRequest({
    path: "/procedure-themes/validate",
    method: "POST",
    token,
    body: { themeId, slugs },
    schema: z.object({ validated: z.int() }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/demarches");
  return { message: t("review.done", { count: result.data.validated, theme: themeTitle }) };
}
