"use client"

import { useActionState } from "react"

import { submitKey, type SignInReport } from "../actions"

/**
 * A key, and where to go afterwards. Nothing else.
 *
 * `autoComplete="current-password"` so a password manager will hold the key,
 * which is the realistic alternative to it living in a note somewhere.
 */
export const SignInForm = ({ from, disabled }: { readonly from: string; readonly disabled: boolean }) => {
  const [report, submit, pending] = useActionState<SignInReport | null, FormData>(submitKey, null)

  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="from" value={from} />

      <label htmlFor="key" className="text-ink-muted text-xs">
        access key
      </label>

      <input
        id="key"
        name="key"
        type="password"
        autoComplete="current-password"
        disabled={disabled}
        className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder rounded-md border p-3 font-mono text-sm disabled:opacity-60"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={disabled || pending}
          className="border-edge-subtle bg-surface-base hover:bg-surface-hover w-fit rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "checking…" : "sign in"}
        </button>

        {report && <span className="text-ink-muted text-xs">{report.detail}</span>}
      </div>
    </form>
  )
}
