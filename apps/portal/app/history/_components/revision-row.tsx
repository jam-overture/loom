import type { StoredRevision } from "@loom/runtime/store"

import { describeOperation } from "@/lib/delta-summary"
import { revisionAnchorId } from "@/lib/history-link"
import type { Reversal } from "@/lib/reversal"

import { ReversalNote } from "./reversal-note"
import { UndoButton } from "./undo-button"

/**
 * One accepted change: what it did to the tree, and who it came from.
 *
 * The revision leads because it is the entry's identity — `revision - 1` is what
 * it applied to, so a log read this way is a chain rather than a list of events
 * that happen to be sorted.
 *
 * Provenance is shown in full rather than summarised. 0016 said the log is what
 * makes 0001's claim real: a stored tree can say what it is, but only a log can
 * say who changed it, when, and why — and a view that dropped the interpreter or
 * the confidence would be keeping the record without showing it.
 *
 * "Allowed by" appears only when there is one, and its absence is deliberately
 * silent. A revision with no `answeredBy` is either a change nobody had to
 * approve or one approved by a host that named nobody, and the revision cannot
 * tell those apart — only the journal can (0029). Rendering "allowed by nobody"
 * would state one of the two as fact.
 *
 * The row carries the id a credit's link points at, and marks itself when it is
 * the one that was asked for. A reader arriving from a node's attribution has a
 * revision in mind; a page that scrolled to it and then looked like every other
 * row would make them count backwards to check they were in the right place.
 *
 * Undo is offered on every revision, not only the newest, because the runtime
 * genuinely supports both (0032) — and where it does not, `planRevert` says why.
 * A revision something later built on is offered too: it comes back held rather
 * than applied, naming the revisions it would write over (0035), which is a
 * better answer than a button that was never shown.
 *
 * The reversal is what that undo would actually do, read from the log before the
 * button is pressed: the prior values a reconfigure wrote over, the subtree a
 * removal destroyed, and whether undoing now writes over later work. When it is
 * absent — this host has no seed, or the log could not be read — the row falls
 * back to offering undo and reporting the outcome on the click, which is what it
 * did before the preview existed. When it says the change cannot be undone, the
 * button is hidden rather than left to fail on a press.
 */
export const RevisionRow = ({
  stored,
  anchored = false,
  reversal,
}: {
  readonly stored: StoredRevision
  /** True when this is the revision a link sent the reader here to read (0043). */
  readonly anchored?: boolean
  /** What undoing this would restore and cost, read from the log (0035, 0016). */
  readonly reversal?: Reversal | undefined
}) => (
  <li
    id={revisionAnchorId(stored.revision)}
    className={`flex scroll-mt-8 flex-col gap-3 rounded-md border p-4 ${
      anchored ? "border-edge-strong bg-surface-active" : "border-edge-subtle bg-surface-base"
    }`}
  >
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="font-mono text-sm">revision {stored.revision}</span>
      <time className="text-ink-muted font-mono text-2xs" dateTime={stored.appliedAt}>
        {stored.appliedAt}
      </time>
    </div>

    <ul className="flex flex-col gap-1">
      {stored.delta.operations.map((operation, index) => {
        const described = describeOperation(operation)

        return (
          <li
            key={`${described.subject}-${index}`}
            className="border-edge-subtle border-l-2 pl-3 text-xs"
          >
            {described.verb} <span className="font-mono">{described.subject}</span>{" "}
            <span className="text-ink-muted">{described.detail}</span>
          </li>
        )
      })}
    </ul>

    <dl className="text-2xs flex flex-wrap gap-x-4 gap-y-1">
      <div className="flex gap-1">
        <dt className="text-ink-muted">asked by</dt>
        <dd className="font-mono">{stored.provenance.actor ?? stored.provenance.origin}</dd>
      </div>
      {stored.answeredBy === undefined ? null : (
        <div className="flex gap-1">
          <dt className="text-ink-muted">allowed by</dt>
          <dd className="font-mono">{stored.answeredBy}</dd>
        </div>
      )}
      <div className="flex gap-1">
        <dt className="text-ink-muted">interpreted by</dt>
        <dd className="font-mono">{stored.provenance.interpreter}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">confidence</dt>
        <dd className="font-mono">{stored.provenance.confidence.toFixed(2)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">proposal</dt>
        <dd className="font-mono">{stored.proposalId}</dd>
      </div>
    </dl>

    {reversal !== undefined && <ReversalNote reversal={reversal} />}

    {(reversal === undefined || reversal.kind === "revertable") && (
      <UndoButton treeId={stored.treeId} revision={stored.revision} />
    )}
  </li>
)
