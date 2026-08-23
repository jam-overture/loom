"use client"

import type { TreeId } from "@loom/runtime"
import { addressedNodeId } from "@loom/runtime/react"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { NodeCredit } from "@/app/(portal)/_lib/attribution-view"
import { PART_KINDS, pointingWords } from "@/app/(portal)/_lib/vocabulary"

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
 * It kept that promise in the runtime's voice. Three monospace pairs headed
 * `node`, `kind` and `addresses` — with `nothing` as a legitimate value of the
 * third — and under them, when the news was bad, `this primitive does not spread
 * loom.editable, so selection falls back to n_card1`. Every word of that is true
 * and none of it answers the question the reader actually has, which is: **can I
 * change this thing or not?**
 *
 * The answer is almost always yes, and it was the one thing the pane never said.
 * Pointing is about the DOM; scoping a request is about the tree (which is why
 * `PromptBox` posts the *requested* node rather than the addressed one). So the
 * pane now leads with the part's name and what it is, says plainly whether the
 * page can be clicked to reach it, and — the sentence that was missing — that a
 * change asked for here applies either way.
 *
 * The name stays on the surface. The 22 August layout defect settled that: a
 * plain sentence describes a class, and what tells two of them apart is the name
 * of the thing. `n_shot2` is a name the way a filename is.
 *
 * Credits are handed down from the server rather than fetched on selection.
 * Selection is a click, and a click that costs a round trip to the log would make
 * the outline feel like it was loading something; the whole tree's attribution is
 * one bounded read on the page the reviewer already waited for.
 */
export const SelectedNode = ({
  credits,
  treeId,
}: {
  readonly credits: Record<string, NodeCredit>
  readonly treeId: TreeId
}) => {
  const { selected } = useSelection()

  if (!selected) {
    return (
      <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-md border border-dashed p-3">
        <p className="text-sm">Nothing picked yet.</p>
        <p className="text-ink-muted text-xs">
          Click any part of the page above, or choose one from the list — then you can ask for a
          change to just that part, and see who put it there.
        </p>
      </div>
    )
  }

  const kind = PART_KINDS[selected.kind]
  const pointing = pointingWords(selected.addressing)
  const addressed = addressedNodeId(selected.addressing)
  const isDirect = selected.addressing.outcome === "addressable"

  return (
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-ink-muted text-2xs tracking-wide uppercase">Picked</p>
        <p className="truncate font-mono text-sm" title={selected.nodeId}>
          {selected.nodeId}
        </p>
        <p className="text-ink-muted text-xs">{kind.label}</p>
      </div>

      {isDirect ? (
        <p className="text-ink-muted text-xs">{pointing.meaning}</p>
      ) : (
        <div
          className={`flex flex-col gap-1 rounded-sm p-2 text-xs ${
            addressed ? "bg-awaiting text-awaiting-ink" : "bg-inapplicable text-inapplicable-ink"
          }`}
        >
          <strong className="font-medium">{pointing.label}</strong>
          <p>{pointing.meaning}</p>
        </div>
      )}

      <NodeCreditLine credit={credits[selected.nodeId]} treeId={treeId} />

      <TechnicalDetail summary="What this addresses">
        <dl className="flex flex-col gap-1">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">node</dt>
            <dd className="truncate font-mono">{selected.nodeId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">kind</dt>
            <dd className="font-mono">{kind.technical}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">addresses</dt>
            <dd className="truncate font-mono">{addressed ?? "nothing"}</dd>
          </div>
        </dl>
        <p className="text-ink-secondary">{pointing.technical}</p>
      </TechnicalDetail>
    </div>
  )
}
