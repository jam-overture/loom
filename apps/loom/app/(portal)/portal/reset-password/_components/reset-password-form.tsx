"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"

import { FormNotice } from "@/app/(portal)/_components/auth-frame"
import { Field, Submit } from "@/app/(portal)/_components/form"
import { PASSWORD_MINIMUM } from "@/app/(portal)/_lib/auth/credentials"
import { FORGOT_PASSWORD_PATH } from "@/app/(portal)/_lib/auth/paths"
import { readRecoveryLink, type RecoveryLink } from "@/app/(portal)/_lib/auth/recovery-link"

import { submitReset, type ResetReport } from "../actions"

/**
 * Reading the token is the one step that has to run in the browser, because
 * the provider puts it after the `#`. It is cleared from the address bar as
 * soon as it is read, so it is not left in history or in a screenshot.
 */
type LinkState = { readonly code: "reading" } | RecoveryLink

export const ResetPasswordForm = () => {
  const [link, setLink] = useState<LinkState>({ code: "reading" })
  const [report, submit] = useActionState<ResetReport | null, FormData>(submitReset, null)

  useEffect(() => {
    setLink(readRecoveryLink(window.location.hash))
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  if (link.code === "reading") return null

  if (link.code === "missing" || report?.code === "refused") {
    return (
      <FormNotice tone="refused">
        {report?.code === "refused"
          ? report.detail
          : "This page needs the link from a password-reset email."}{" "}
        <Link href={FORGOT_PASSWORD_PATH}>Ask for a new link</Link>.
      </FormNotice>
    )
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={link.token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MINIMUM}
        hint={`At least ${PASSWORD_MINIMUM} characters.`}
        fault={report?.code === "fault" ? report.detail : undefined}
      />
      <Submit label="Set the password" pendingLabel="Saving…" />
    </form>
  )
}
