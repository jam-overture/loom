"use client"

import { useActionState, useState } from "react"

import { Submit } from "@/app/(portal)/_components/form"

import { issuePublishKeyAction, type PublishKeyReport } from "../actions"
import { CopyButton } from "./copy-button"

/**
 * Making a project's publish key, or replacing it, and showing it the once.
 *
 * **The key is shown once** (0312 clause 2): the store keeps only its digest,
 * so what the action returns is the only copy, and the screen says so beside
 * it. **Replacing asks twice**, for `key-controls.tsx`'s reason: a new key
 * stops the build carrying the old one, and that is worth reading first.
 */
export const PublishKeyControls = ({ projectId, held }: { projectId: string; held: boolean }) => {
  const [report, action] = useActionState<PublishKeyReport | null, FormData>(
    issuePublishKeyAction,
    null
  )
  const [asking, setAsking] = useState(false)

  if (report?.key !== undefined) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <code className="border-edge-subtle bg-surface-page min-w-0 flex-1 truncate rounded-md border px-2.5 py-1.5 font-mono text-xs">
            {report.key}
          </code>
          <CopyButton text={report.key} label="Copy the publish key" />
        </div>
        <p className="text-ink-muted text-xs">
          Copy it now and keep it where your build keeps its secrets. It is not shown again.
        </p>
      </div>
    )
  }

  const refusal =
    report?.detail === undefined ? null : <p className="text-refuse-ink text-xs">{report.detail}</p>

  if (!held) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <Submit label="Make a publish key" pendingLabel="Making it…" />
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
          Replace the publish key
        </button>
        {refusal}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-ink-muted text-xs">
        A build still sending the key you have now is refused as soon as the new one is made. Put
        the new key wherever the old one is.
      </p>
      {refusal}
      <div className="flex gap-2">
        <Submit label="Make a new publish key" pendingLabel="Making it…" />
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
