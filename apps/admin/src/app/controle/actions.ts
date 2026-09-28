"use server";

import { APP_FEATURES, remoteConfigSchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/**
 * An admin switches features and sets the minimum app version. The API checks the
 * role and journals the change; every app follows within about a minute.
 */
export async function saveRemoteConfig(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const typed = formText(form, "minVersion").trim();
  const config = remoteConfigSchema.safeParse({
    minVersion: typed === "" ? null : typed,
    features: Object.fromEntries(APP_FEATURES.map((feature) => [feature, form.has(feature)])),
  });
  if (!config.success) {
    return { error: t("remote.minVersionInvalid") };
  }
  const result = await adminRequest({
    path: "/remote-config",
    method: "PUT",
    token,
    body: config.data,
    schema: z.object({ saved: z.literal(true) }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("remote.adminOnly") : t("review.failed") };
  }
  revalidatePath("/controle");
  return { message: t("remote.saved") };
}
