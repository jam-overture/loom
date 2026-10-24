"use client"

import Link from "next/link"
import { useActionState } from "react"

import { FormNotice } from "@/app/(portal)/_components/auth-frame"
import { Field, Submit } from "@/app/(portal)/_components/form"
import { FORGOT_PASSWORD_PATH } from "@/app/(portal)/_lib/auth/paths"

import { submitKey, submitPassword, type SignInReport } from "../actions"

/**
 * The two ways in, and where to go afterwards. Nothing else.
 *
 * **An email and a password first** (0310), because that is the way in a
 * person expects. **A minted key second**, folded away, because accounts the
 * command line made still sign in with one (0285).
 *
 * `autoComplete` is set on every field so a password manager holds the right
 * thing in the right place, which is the realistic alternative to a password
 * living in a note somewhere.
 *
 * **A refusal is said where the eye already is**: under the fields, in the
 * colour a refused change is drawn in, and announced. It sat beside the button
 * in muted text the size of a footnote, and a credential that was not
 * recognised read as a form that did nothing — a password manager filling in a
 * replaced key looks exactly like that.
 */
export const PasswordSignInForm = ({
  from,
  disabled,
}: {
  readonly from: string
  readonly disabled: boolean
}) => {
  const [report, submit] = useActionState<SignInReport | null, FormData>(submitPassword, null)

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={report?.email}
        disabled={disabled}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        disabled={disabled}
      />
      {report !== null && <FormNotice tone="refused">{report.detail}</FormNotice>}
      <div className="flex flex-wrap items-center gap-4">
        <Submit label="Sign in" pendingLabel="Checking…" disabled={disabled} />
        <Link href={FORGOT_PASSWORD_PATH} className="text-ink-muted hover:text-ink text-xs">
          Forgot your password?
        </Link>
      </div>
    </form>
  )
}

export const KeySignInForm = ({
  from,
  disabled,
}: {
  readonly from: string
  readonly disabled: boolean
}) => {
  const [report, submit] = useActionState<SignInReport | null, FormData>(submitKey, null)

  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="from" value={from} />
      <Field label="Access key" name="key" type="password" autoComplete="off" disabled={disabled} />
      {report !== null && <FormNotice tone="refused">{report.detail}</FormNotice>}
      <Submit label="Sign in with the key" pendingLabel="Checking…" disabled={disabled} />
    </form>
  )
}
