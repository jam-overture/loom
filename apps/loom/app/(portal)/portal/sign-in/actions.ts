"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { emailSchema } from "@/app/(portal)/_lib/auth/credentials"
import {
  describeSignInProblem,
  signIn,
  signInWithPassword,
  signOut,
} from "@/app/(portal)/_lib/auth/identity"
import { safeReturnPath, SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

/**
 * The actions that start and end a session.
 *
 * A form posts a credential and where it came from, and never who it claims to
 * be: an email and the password that proves it, or a minted key that is the
 * identity on its own (0027). There is no name field to disagree with the
 * credential.
 */

/**
 * What a refused attempt says, and the address that was typed.
 *
 * The address comes back because React resets a form once its action
 * finishes, and a refusal that also emptied the email box would make the next
 * try a retype.
 */
export type SignInReport = {
  readonly detail: string
  readonly email?: string
}

const keySchema = z.string().trim().min(1, "Paste your access key.")

export const submitKey = async (
  _previous: SignInReport | null,
  form: FormData
): Promise<SignInReport> => {
  const parsed = keySchema.safeParse(form.get("key"))
  if (!parsed.success) {
    return { detail: parsed.error.issues[0]?.message ?? "That was not a key." }
  }

  const attempt = await signIn(parsed.data)

  if (!attempt.ok) return { detail: describeSignInProblem(attempt.error) }

  redirect(safeReturnPath(form.get("from")?.toString()))
}

/**
 * Signing in with an email and a password (0310).
 *
 * The password is not held to the length a new one must have: the provider is
 * what knows whether it is right, and a rule here that refused a password the
 * provider accepted would lock its owner out of their own account.
 */
const signInFields = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
})

export const submitPassword = async (
  _previous: SignInReport | null,
  form: FormData
): Promise<SignInReport> => {
  const email = form.get("email")?.toString() ?? ""
  const parsed = signInFields.safeParse({ email, password: form.get("password") ?? "" })
  if (!parsed.success) {
    return { detail: parsed.error.issues[0]?.message ?? "Check the address and password.", email }
  }

  const attempt = await signInWithPassword(parsed.data)

  if (!attempt.ok) return { detail: describeSignInProblem(attempt.error), email }

  redirect(safeReturnPath(form.get("from")?.toString()))
}

export const endSession = async (): Promise<void> => {
  await signOut()
  redirect(SIGN_IN_PATH)
}
