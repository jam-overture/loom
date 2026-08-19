"use client"

import { useActionState } from "react"

import { toneClasses, type WriteReport } from "@/app/(portal)/_lib/outcome"

import { proposeChange } from "../actions"
import { useSelection } from "./selection-context"

/**
 * Where a change is asked for.
 *
 * It posts a sentence and the revision it was looking at — never a delta (0017).
 * The scope is the node the user selected, not the node the DOM could address:
 * scoping narrows *interpretation*, which happens over the tree, so a text node
 * is a perfectly good subtree to point at even though nothing in the page can be
 * clicked to reach it.
 */
export const PromptBox = ({
  treeId,
  revision,
  configured,
}: {
  readonly treeId: string
  readonly revision: number
  readonly configured: boolean
}) => {
  const { selected } = useSelection()
  const [report, submit, pending] = useActionState<WriteReport | null, FormData>(
    proposeChange,
    null
  )

  return (
    <form action={submit} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg tracking-tight">ask for a change</h2>
        <span className="text-ink-muted font-mono text-2xs">
          {selected ? `scoped to ${selected.nodeId}` : "whole tree"}
        </span>
      </div>

      <input type="hidden" name="treeId" value={treeId} />
      <input type="hidden" name="baseRevision" value={revision} />
      <input type="hidden" name="scopeNodeId" value={selected?.nodeId ?? ""} />

      <textarea
        name="utterance"
        rows={3}
        disabled={!configured}
        placeholder={
          configured
            ? "Make the heading say something else."
            : "Set LOOM_ANTHROPIC_API_KEY to compose changes."
        }
        className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder resize-y rounded-md border p-3 text-sm disabled:opacity-60"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !configured}
          className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "composing…" : "propose"}
        </button>
        <span className="text-ink-muted text-2xs">
          composed on the server, gated, then written
        </span>
      </div>

      {report && (
        <div className={`rounded-md p-3 text-xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong>
          <p className="mt-1">{report.detail}</p>
        </div>
      )}
    </form>
  )
}
