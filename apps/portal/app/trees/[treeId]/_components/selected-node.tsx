"use client"

import { addressedNodeId, describeAddressing } from "@loom/runtime/react"

import type { NodeCredit } from "@/lib/attribution-view"

import { NodeCreditLine } from "./node-credit"
import { useSelection } from "./selection-context"

/**
 * What the current selection actually addresses, and who put it there.
 *
 * This is the pane that keeps 0019's promise about degradation: when a selection
 * falls back to an ancestor, the fallback is stated rather than performed
 * silently. A user scoping an intent to "this text" needs to know the intent will
 * name the heading around it.
 *
 * Credits are handed down from the server rather than fetched on selection.
 * Selection is a click, and a click that costs a round trip to the log would make
 * the outline feel like it was loading something; the whole tree's attribution is
 * one bounded read on the page the reviewer already waited for.
 */
export const SelectedNode = ({ credits }: { readonly credits: Record<string, NodeCredit> }) => {
  const { selected } = useSelection()

  if (!selected) {
    return (
      <p className="text-ink-muted text-xs">
        Select a node — in the outline, or by clicking the preview — to see what it addresses.
      </p>
    )
  }

  const addressed = addressedNodeId(selected.addressing)
  const isDirect = selected.addressing.outcome === "addressable"

  return (
    <dl className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-3 text-xs">
      <div className="flex justify-between gap-3">
        <dt className="text-ink-muted">node</dt>
        <dd className="truncate font-mono">{selected.nodeId}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-muted">kind</dt>
        <dd className="font-mono">{selected.kind}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-muted">addresses</dt>
        <dd className="truncate font-mono">{addressed ?? "nothing"}</dd>
      </div>
      {!isDirect && (
        <p className={`rounded-sm p-2 ${addressed ? "bg-awaiting text-awaiting-ink" : "bg-rejected text-rejected-ink"}`}>
          {describeAddressing(selected.addressing)}
        </p>
      )}
      <NodeCreditLine credit={credits[selected.nodeId]} />
    </dl>
  )
}
