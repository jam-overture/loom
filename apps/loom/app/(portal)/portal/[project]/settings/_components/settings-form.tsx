"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import { faultFor } from "@/app/(portal)/_lib/registering"

import { saveSettingsAction, type SettingsReport } from "../actions"

/**
 * An owner's form for what a project is called and where its site lives.
 *
 * The boxes start with what the project has, so saving what is in them is the
 * whole act, and a save that was refused keeps what was typed beside the
 * reason. A save that worked says so, because the boxes already show the new
 * values and nothing else on the screen would change.
 */
export const SettingsForm = ({
  projectId,
  name,
  host,
}: {
  projectId: string
  name: string
  host: string | undefined
}) => {
  const [report, action] = useActionState<SettingsReport | null, FormData>(saveSettingsAction, null)
  const faults = report?.faults ?? []

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <Field label="Name" name="name" defaultValue={name} fault={faultFor(faults, "name")} />
      <Field
        label="Your site's address"
        name="host"
        defaultValue={host ?? ""}
        placeholder="shop.example.com"
        hint="Exactly as readers reach it, www included. Leave it empty to take signals from any site."
        fault={faultFor(faults, "host")}
      />
      {report?.detail !== undefined && <p className="text-refuse-ink text-xs">{report.detail}</p>}
      {report !== null && report.detail === undefined && faults.length === 0 && (
        <p className="text-ink-muted text-xs">Saved.</p>
      )}
      <div>
        <Submit label="Save" pendingLabel="Saving…" />
      </div>
    </form>
  )
}
