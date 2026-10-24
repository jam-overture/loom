"use client"

import Link from "next/link"
import { useActionState } from "react"

import { FormNotice } from "@/app/(portal)/_components/auth-frame"
import { Field, Submit } from "@/app/(portal)/_components/form"
import { credentialFaultFor, PASSWORD_MINIMUM } from "@/app/(portal)/_lib/auth/credentials"
import { SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

import { submitSignUp, type SignUpReport } from "../actions"

/**
 * The form, and what it says once the account exists.
 *
 * A made account replaces the form rather than sitting under it, because the
 * next thing to do is in the person's inbox or on the sign-in page, and a
 * form still on screen invites making the same account twice.
 */
export const SignUpForm = () => {
  const [report, submit] = useActionState<SignUpReport | null, FormData>(submitSignUp, null)

  if (report?.code === "confirm-by-email") {
    return (
      <FormNotice tone="done">
        Check {report.email} for a link to confirm the address, then sign in.
      </FormNotice>
    )
  }

  if (report?.code === "confirmed") {
    return (
      <FormNotice tone="done">
        Your account is ready. <Link href={SIGN_IN_PATH}>Sign in</Link>.
      </FormNotice>
    )
  }

  const faults = report?.faults ?? []

  return (
    <form action={submit} className="flex flex-col gap-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={report?.email}
        fault={credentialFaultFor(faults, "email")}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MINIMUM}
        hint={`At least ${PASSWORD_MINIMUM} characters.`}
        fault={credentialFaultFor(faults, "password")}
      />
      {report?.detail !== undefined && <FormNotice tone="refused">{report.detail}</FormNotice>}
      <Submit label="Create the account" pendingLabel="Creating…" />
    </form>
  )
}
