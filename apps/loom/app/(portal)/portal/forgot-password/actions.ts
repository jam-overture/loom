"use server"

import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { emailSchema } from "@/app/(portal)/_lib/auth/credentials"
import { requestRecovery } from "@/app/(portal)/_lib/auth/identity"
import { RESET_PASSWORD_PATH } from "@/app/(portal)/_lib/auth/paths"

/**
 * Asking for a link to set a new password (0304).
 *
 * **One answer whatever happened**, so the form cannot be asked which
 * addresses have accounts; only a malformed address is told so, which reveals
 * nothing about anybody.
 */

export type RecoveryReport =
  | { readonly code: "refused"; readonly detail: string; readonly email: string }
  | { readonly code: "sent" }

export const submitRecovery = async (
  _previous: RecoveryReport | null,
  form: FormData
): Promise<RecoveryReport> => {
  const typed = form.get("email")?.toString() ?? ""
  const email = emailSchema.safeParse(typed)
  if (!email.success) {
    return {
      code: "refused",
      detail: email.error.issues[0]?.message ?? "Check the address.",
      email: typed,
    }
  }

  await requestRecovery(email.data, `${await servedOrigin()}${RESET_PASSWORD_PATH}`)

  return { code: "sent" }
}
