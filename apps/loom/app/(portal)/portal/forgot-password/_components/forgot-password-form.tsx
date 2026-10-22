"use client"

import { useActionState } from "react"

import { FormNotice } from "@/app/(portal)/_components/auth-frame"
import { Field, Submit } from "@/app/(portal)/_components/form"

import { submitRecovery, type RecoveryReport } from "../actions"

export const ForgotPasswordForm = () => {
  const [report, submit] = useActionState<RecoveryReport | null, FormData>(submitRecovery, null)

  if (report?.code === "sent") {
    return (
      <FormNotice tone="done">
        If that address has an account here, a link to set a new password is on its way. It works
        once, so use the newest one.
      </FormNotice>
    )
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={report?.code === "refused" ? report.email : undefined}
        fault={report?.code === "refused" ? report.detail : undefined}
      />
      <Submit label="Send the link" pendingLabel="Sending…" />
    </form>
  )
}
