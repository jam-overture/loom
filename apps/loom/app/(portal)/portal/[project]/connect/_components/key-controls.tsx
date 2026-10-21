"use client"

import { useActionState, useState } from "react"

import { Submit } from "@/app/(portal)/_components/form"

import { issueKeyAction, type ConnectReport } from "../actions"

/**
 * Making a project's first key, or replacing the one it has.
 *
 * **Replacing asks twice**, and making the first does not. A first key ends
 * nothing; a new one stops every page carrying the old one from being counted
 * the moment it is saved (0298 clause 1), and that is a consequence somebody
 * should read before it happens rather than find in a count that went quiet —
 * the same reason closing a project asks twice.
 *
 * The screen mounts this under the key it shows, so a replacement that
 * worked is a new component with nothing asked yet, and one that was refused
 * keeps the question open beside the reason.
 */

export const KeyControls = ({ projectId, held }: { projectId: string; held: boolean }) => {
  const [report, action] = useActionState<ConnectReport | null, FormData>(issueKeyAction, null)
  const [asking, setAsking] = useState(false)

  const refusal =
    report?.detail === undefined ? null : <p className="text-refuse-ink text-xs">{report.detail}</p>

  if (!held) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <Submit label="Make a key" pendingLabel="Making it…" />
        {refusal}
      </form>
    )
  }

  if (!asking) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="border-edge text-ink self-start rounded-md border px-2.5 py-1 text-xs"
        >
          Replace the key
        </button>
        {refusal}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-ink-muted text-xs">
        Every page still sending the key you have now stops being counted as soon as the new one is
        made. Paste the new snippet wherever the old one is.
      </p>
      {refusal}
      <div className="flex gap-2">
        <Submit label="Make a new key" pendingLabel="Making it…" />
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="border-edge text-ink rounded-md border px-2.5 py-1 text-xs"
        >
          Keep this one
        </button>
      </div>
    </form>
  )
}
