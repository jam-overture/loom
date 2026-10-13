"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import { faultFor } from "@/app/(portal)/_lib/registering"

import { renameApplication, type RenameReport } from "../actions"

/**
 * The two fields an application has of its own, with what they are now in them.
 *
 * `defaultValue` rather than `value`, so the inputs are the browser's and a
 * refused submit comes back with what was typed rather than with what was
 * stored — which is the whole of what somebody minds about a form that says no.
 *
 * The application's id travels as a hidden field rather than being bound to the
 * action, because the action parses it either way and an id in a URL is not a
 * secret. What it is not is trusted: `applicationFromRoute` is the same parse
 * every screen under `/portal/[application]` makes.
 */
export const SettingsForm = ({
  applicationId,
  name,
  host,
}: {
  applicationId: string
  name: string
  host: string | undefined
}) => {
  const [report, action] = useActionState<RenameReport | null, FormData>(renameApplication, null)
  const faults = report?.faults ?? []

  return (
    <form action={action} className="flex max-w-lg flex-col gap-5">
      <input type="hidden" name="applicationId" value={applicationId} />

      <Field
        label="What is it called?"
        name="name"
        defaultValue={name}
        hint="What you look for in the list. Nothing depends on it."
        fault={faultFor(faults, "name")}
      />

      <Field
        label="Where does it live?"
        name="host"
        defaultValue={host ?? ""}
        placeholder="shop.example.com"
        hint="Paste the address if it is easier — we will take the host out of it."
        fault={faultFor(faults, "host")}
      />

      {report?.detail === undefined ? null : (
        <p className="text-refuse-ink text-sm">{report.detail}</p>
      )}

      {report?.saved === true && faults.length === 0 ? (
        <p className="text-ink-muted text-sm">Saved.</p>
      ) : null}

      <Submit label="Save" pendingLabel="Saving…" />
    </form>
  )
}
