"use client"

import { useActionState } from "react"

import type { TreeId } from "@loom/runtime"

import { toneClasses } from "@/lib/outcome"

import { undoRevision } from "../actions"

/**
 * Undo, offered on the latest revision only (0032).
 *
 * The button is not the decision. An undo is a proposal like any other, so this
 * can come back held, or refused, and the report says which — a control that
 * always looked like it worked would be lying about the one property the whole
 * page exists to evidence.
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
