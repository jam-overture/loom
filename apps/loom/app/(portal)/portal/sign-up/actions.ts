"use server"

import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { readCredentials, type CredentialFault } from "@/app/(portal)/_lib/auth/credentials"
import { signUp } from "@/app/(portal)/_lib/auth/identity"
import { SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

/**
 * Opening an account with an email and a password (0304).
 *
 * The confirmation email links back to the sign-in page on the host the
 * person is on, so a preview deployment confirms into itself. The provider
 * only honours an address on its own redirect list, which is what stops a
 * forged `Host` from sending the link anywhere else.
 */

export type SignUpReport =
  | {
      readonly code: "refused"
      readonly faults: readonly CredentialFault[]
      readonly detail?: string
      /** As typed, so the reset React gives a finished form does not empty it. */
      readonly email: string
    }
  | { readonly code: "confirm-by-email"; readonly email: string }
  | { readonly code: "confirmed" }

export const submitSignUp = async (
  _previous: SignUpReport | null,
  form: FormData
): Promise<SignUpReport> => {
  const email = form.get("email")?.toString() ?? ""
  const read = readCredentials({ email, password: form.get("password") })
  if (!read.ok) return { code: "refused", faults: read.faults, email }

  const made = await signUp(read.value, `${await servedOrigin()}${SIGN_IN_PATH}`)
  if (!made.ok) return { code: "refused", faults: [], detail: made.detail, email }

  return made.outcome === "confirmed"
    ? { code: "confirmed" }
    : { code: "confirm-by-email", email: read.value.email }
}
