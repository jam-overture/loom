"use client"

import { useActionState, useState } from "react"

import { closeProjectAction, reopenProjectAction, type ClosingReport } from "../actions"

/**
 * Close a project, or open it again.
 *
 * **The button says Close, because closing is what happens**
 * ([0289](../../../../../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md)).
 * A control labelled *Delete* that closed would be the worst of the three
 * options: it would teach that this product's words are approximate, on the one
 * screen where a person is deciding whether to trust it with the record of
 * their pages.
 *
 * ## Why it asks twice
 *
 * Not because closing is dangerous — it is the reversible operation, which is
 * the entire argument for it — but because it stops a project collecting, and
 * a reader who was arriving stops arriving. That is a consequence somebody
 * should meet before it happens rather than discover in a figure that went
 * quiet. The confirmation says what closing does and what it does not.
 *
 * A client component for that one reason: the second press is state, and
 * nothing else here is.
 */

export const ClosingControls = ({
  projectId,
  name,
  closedAt,
}: {
  projectId: string
  name: string
  closedAt?: string | undefined
}) => {
  const [closing, action] = useActionState<ClosingReport | null, FormData>(
    closedAt === undefined ? closeProjectAction : reopenProjectAction,
    null
  )
  const [asking, setAsking] = useState(false)

  if (closedAt !== undefined) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-muted text-[11px]">
            Closed {new Date(closedAt).toLocaleDateString("en-GB")}
          </span>
          <button
            type="submit"
            className="border-edge text-ink rounded-md border px-2.5 py-1 text-xs"
          >
            Reopen
          </button>
        </div>
        {closing?.detail !== undefined && (
          <p className="text-refuse-ink text-[11px]">{closing.detail}</p>
        )}
      </form>
    )
  }

  if (!asking) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="text-ink-muted hover:text-ink border-edge rounded-md border px-2.5 py-1 text-xs"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-ink text-xs">
        Close <span className="font-medium">{name}</span>? It stops taking signals and leaves your
        workspace. <span className="text-ink-muted">Nothing is deleted</span> — its pages, its
        history and what its readers did all stay, and you can reopen it.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="border-refuse-edge text-refuse-ink rounded-md border px-2.5 py-1 text-xs"
        >
          Close it
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="text-ink-muted px-2.5 py-1 text-xs"
        >
          Keep it
        </button>
      </div>
      {closing?.detail !== undefined && (
        <p className="text-refuse-ink text-[11px]">{closing.detail}</p>
      )}
    </form>
  )
}
