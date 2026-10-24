import { z } from "zod"

import { actorSchema, type Actor } from "./accounts"

/**
 * What a person types to sign up, sign in and recover a password, and which
 * addresses this deployment lets in (0310).
 *
 * Pure, like `throttle.ts` beside it: no clock, no IO and no `process.env`, so
 * every rule a person meets on the forms is tested without a request.
 */

/**
 * An email address, as the actor it signs in as.
 *
 * **Lowercased**, because the provider matches addresses without regard to
 * case and an actor is compared exactly: `Ana@Example.com` and
 * `ana@example.com` signing in as two actors would split one person's roles.
 * It must also be a usable actor id, which keeps it to the characters
 * provenance and the portal render without escaping.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("That does not look like an email address."))
  .pipe(actorSchema)

/**
 * A password a person chooses.
 *
 * Twelve characters at least, which is the one rule that measurably matters
 * against guessing; no composition rules, which push people towards patterns
 * rather than length. Seventy-two at most, because that is where the
 * provider's hash stops reading.
 */
export const PASSWORD_MINIMUM = 12
export const PASSWORD_MAXIMUM = 72

export const passwordSchema = z
  .string()
  .min(PASSWORD_MINIMUM, `Use at least ${PASSWORD_MINIMUM} characters.`)
  .max(PASSWORD_MAXIMUM, `Use at most ${PASSWORD_MAXIMUM} characters.`)

/** The variable that names who may have an account here. */
export const ALLOWED_EMAILS_KEY = "LOOM_PORTAL_EMAILS"

/**
 * The addresses allowed an account, from a comma-separated list.
 *
 * **Unset is nobody**, not everybody. A deployment that forgot the variable
 * and opened sign-up to the internet would be handing out projects, keys and
 * a door that files signals to anyone who found the form; one that forgot it
 * and admitted nobody is fixed by setting it. An entry that is not an address
 * is dropped rather than refusing the list, so one typo does not lock out
 * every other person on it.
 */
export const readAllowedEmails = (value: string | undefined): ReadonlySet<Actor> =>
  new Set(
    (value ?? "").split(",").flatMap((entry) => {
      const parsed = emailSchema.safeParse(entry)

      return parsed.success ? [parsed.data] : []
    })
  )

/**
 * The fault for one field of a form, so it prints under the input it belongs
 * to. Every fault is reported rather than the first, as on registration.
 */
export type CredentialFault =
  | { readonly field: "email"; readonly detail: string }
  | { readonly field: "password"; readonly detail: string }

export type Credentials = { readonly email: Actor; readonly password: string }

export const readCredentials = (fields: {
  readonly email: unknown
  readonly password: unknown
}):
  | { readonly ok: true; readonly value: Credentials }
  | { readonly ok: false; readonly faults: readonly CredentialFault[] } => {
  const email = emailSchema.safeParse(typeof fields.email === "string" ? fields.email : "")
  const password = passwordSchema.safeParse(
    typeof fields.password === "string" ? fields.password : ""
  )

  if (email.success && password.success) {
    return { ok: true, value: { email: email.data, password: password.data } }
  }

  return {
    ok: false,
    faults: [
      ...(email.success
        ? []
        : [
            {
              field: "email" as const,
              detail: email.error.issues[0]?.message ?? "Check the address.",
            },
          ]),
      ...(password.success
        ? []
        : [
            {
              field: "password" as const,
              detail: password.error.issues[0]?.message ?? "Check the password.",
            },
          ]),
    ],
  }
}

export const credentialFaultFor = (
  faults: readonly CredentialFault[],
  field: CredentialFault["field"]
): string | undefined => faults.find((fault) => fault.field === field)?.detail
