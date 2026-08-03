"use client"

import { useActionState } from "react"

import type { TreeId } from "@loom/runtime"

import { toneClasses } from "@/lib/outcome"

import { undoRevision } from "../actions"

/**
 * Undo, on a revision the log still allows undoing.
 *
 * The button is not the decision, and the report under it is the point. An undo
 * is an ordinary proposal (0032), so it can come back held for a second person,
 * refused by the Gate, or declined because something later built on the change —
 * and a control that always looked like it worked would be lying about the one
 * property this page exists to evidence.
 */
export const UndoButton = ({
  treeId,
  revision,
}: {
  readonly treeId: TreeId
  readonly revision: number
}) => {
  const [report, submit, pending] = useActionState(undoRevision, null)

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="treeId" value={treeId} />
      <input type="hidden" name="revision" value={revision} />

      <button
        type="submit"
        disabled={pending}
        className="border-edge bg-neutral text-neutral-ink w-fit rounded-sm border px-2 py-1 text-2xs disabled:opacity-60"
      >
        {pending ? "undoing…" : "undo this change"}
      </button>

      {report === null ? null : (
        <p className={"rounded-sm px-2 py-1 text-2xs " + toneClasses(report.tone)}>
          <span className="font-medium">{report.headline}</span> — {report.detail}
        </p>
      )}
    </form>
  )
}
