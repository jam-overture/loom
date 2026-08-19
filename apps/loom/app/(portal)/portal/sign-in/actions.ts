"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { describeSignInProblem, signIn, signOut } from "@/app/(portal)/_lib/auth/identity"
import { safeReturnPath, SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

/**
 * The two actions that start and end a session.
 *
 * The form posts a key and where it came from. It does not post who it claims to
 * be: the key is the identity (0027), so there is no name field to disagree with
 * the credential, and no way for a reviewer to sign in as someone else by typing
 * their name next to a key they legitimately hold.
 */

export type SignInReport = {
  readonly detail: string
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

export const endSession = async (): Promise<void> => {
  await signOut()
  redirect(SIGN_IN_PATH)
}
