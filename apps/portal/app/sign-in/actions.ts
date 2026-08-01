"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { signIn, signOut } from "@/lib/auth/identity"
import { safeReturnPath, SIGN_IN_PATH } from "@/lib/auth/paths"

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

  if (!attempt.ok) {
    return {
      detail:
        attempt.error.code === "not-configured"
          ? attempt.error.detail
          : /**
             * One message for a wrong key, whoever it did or did not belong to.
             * Saying "no such reviewer" would turn the form into a way to
             * enumerate the roster.
             */
            "That key was not recognised.",
    }
  }

  redirect(safeReturnPath(form.get("from")?.toString()))
}

export const endSession = async (): Promise<void> => {
  await signOut()
  redirect(SIGN_IN_PATH)
}
