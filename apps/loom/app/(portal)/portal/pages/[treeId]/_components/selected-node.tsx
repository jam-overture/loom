"use client"

import type { TreeId } from "@jam-overture/loom"
import { addressedNodeId } from "@jam-overture/loom/react"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { NodeCredit } from "@/app/(portal)/_lib/attribution-view"
import type { OutlineRow } from "@/app/(portal)/_lib/outline"
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
 * It is no longer the *first* thing here, though, and that is this pane's half
 * of the rail's change. A filename is a name for the file you already know you
 * want; a reader who has just clicked something wants to know what they clicked.
 * So the part's own word leads, the id follows it, and the registry's word for
 * the same part — the `loom.card` the rail beside this used to print on every
 * row — is the pair added to the disclosure that already holds the node and the
 * kind.
 *
 * Credits are handed down from the server rather than fetched on selection.
 * Selection is a click, and a click that costs a round trip to the log would make
 * the outline feel like it was loading something; the whole tree's attribution is
 * one bounded read on the page the reviewer already waited for.
 *
 * ## One block per picked part, stacked, as of phase 2
 *
 * A reader can pick several, and the honest treatment of that is the one that
 * loses nothing: every picked part gets the same block it got when it was the
 * only one. The alternative was a compact list with the detail collapsed behind
 * a row, and it fails the rule this whole surface is held to — a screen made
 * simpler by removing what it used to say. A reader who picks six parts gets a
 * long rail, which is the honest consequence of picking six parts.
 *
 * The blocks are in the order the page holds them, because `picked` is the
 * outline filtered rather than the clicks remembered. A rail that listed them in
 * the order they were clicked would disagree with the pictures under the page
 * about what "these three parts" means.
 */
export const SelectedNode = ({
  credits,
  treeId,
}: {
  readonly credits: Record<string, NodeCredit>
  readonly treeId: TreeId
}) => {
  const { picked } = useSelection()

  if (picked.length === 0) {
    return (
      <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-md border border-dashed p-3">
        <p className="text-sm">Nothing picked yet.</p>
        <p className="text-ink-muted text-xs">
          Click any part of the page above, or choose one from the list — then you can ask for a
          change to just that part, and see who put it there. Pick more than one and they are
          drawn together under the page.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {picked.map((row) => (
        <PickedDetail key={row.nodeId} row={row} credit={credits[row.nodeId]} treeId={treeId} />
      ))}
    </div>
  )
}

/** One picked part, in full. Everything this pane has ever said about one node. */
const PickedDetail = ({
  row: selected,
  credit,
  treeId,
}: {
  readonly row: OutlineRow
  readonly credit: NodeCredit | undefined
  readonly treeId: TreeId
}) => {
  const kind = PART_KINDS[selected.kind]
  const pointing = pointingWords(selected.addressing)
  const addressed = addressedNodeId(selected.addressing)
  const isDirect = selected.addressing.outcome === "addressable"

  return (
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-3">
      {/*
        * The pane led with `n_seed9` in the largest text it had, and the one
        * thing a reader wants from it first is *which part of my page is this*.
        * An id answers that for the log and for nothing a person can see.
        *
        * So the order is 6 September's: the words first, the identifier under
        * them, quieter and in monospace. The id does not go behind a disclosure
        * — 22 August settled that identity is not technical detail — and the
        * kind sits between the two as the category the name belongs to.
        */}
      <div className="flex flex-col gap-0.5">
        <p className="text-ink-muted text-2xs tracking-wide uppercase">Picked</p>
        <p className="truncate text-sm" title={selected.label}>
          {selected.label}
        </p>
        <p className="text-ink-muted text-xs">{kind.label}</p>
        <p className="text-ink-muted truncate font-mono text-2xs" title={selected.nodeId}>
          {selected.nodeId}
        </p>
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

      <NodeCreditLine credit={credit} treeId={treeId} />

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
          {/*
            * Where `loom.card` went when the rail stopped printing it. A text
            * node has no pair here because it has no name of its own: the row
            * is its words, and the runtime would say the same thing back.
            */}
          {selected.technical !== null && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{selected.kind === "slot" ? "slot" : "type"}</dt>
              <dd className="truncate font-mono">{selected.technical}</dd>
            </div>
          )}
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
