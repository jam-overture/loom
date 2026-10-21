"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"

import { setHostAction, type ConnectReport } from "../actions"

/**
 * Changing the site a project's deliveries are taken from, or clearing it.
 *
 * The box starts with the host the project has, so what it says is what the
 * door is holding deliveries to, and saving what is in it is the whole act.
 * The screen mounts this under the host it shows, so a save that worked is a
 * new component holding the new host, and one that was refused keeps what was
 * typed beside the reason.
 */
export const HostControls = ({
  projectId,
  host,
}: {
  projectId: string
  host: string | undefined
}) => {
  const [report, action] = useActionState<ConnectReport | null, FormData>(setHostAction, null)

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Field
        label="Your site's address"
        name="host"
        defaultValue={host ?? ""}
        placeholder="shop.example.com"
        hint="Exactly as readers reach it, www included. Leave it empty to take signals from any site."
        fault={report?.detail}
      />
      <div>
        <Submit label="Save the address" pendingLabel="Saving…" />
      </div>
    </form>
  )
}
