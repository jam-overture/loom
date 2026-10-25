"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { passwordSchema } from "@/app/(portal)/_lib/auth/credentials"
import { resetPassword } from "@/app/(portal)/_lib/auth/identity"
import { DEFAULT_LANDING } from "@/app/(portal)/_lib/auth/paths"

/**
 * Choosing a new password with the token a recovery link carried (0310), and
 * signing its owner in.
 */

export type ResetReport =
  | { readonly code: "refused"; readonly detail: string }
  | { readonly code: "fault"; readonly detail: string }

const resetFields = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const submitReset = async (
  _previous: ResetReport | null,
  form: FormData
): Promise<ResetReport> => {
  const parsed = resetFields.safeParse({
    token: form.get("token") ?? "",
    password: form.get("password") ?? "",
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]

    return issue?.path[0] === "password"
      ? { code: "fault", detail: issue.message }
      : { code: "refused", detail: "That link is incomplete. Ask for a new one." }
  }

  const reset = await resetPassword(parsed.data.token, parsed.data.password)
  if (!reset.ok) return { code: "refused", detail: reset.detail }

  redirect(DEFAULT_LANDING)
}
