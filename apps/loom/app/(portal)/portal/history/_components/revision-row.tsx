import type { StoredRevision } from "@loom/runtime/store"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { describeOperation, summariseOperations } from "@/app/(portal)/_lib/delta-summary"
import { revisionAnchorId } from "@/app/(portal)/_lib/history-link"
import type { Reversal } from "@/app/(portal)/_lib/reversal"
import { revisionView } from "@/app/(portal)/_lib/revision-view"
import { plainMoment } from "@/app/(portal)/_lib/when"

import { ReversalNote } from "./reversal-note"
import { UndoButton } from "./undo-button"

/**
 * One accepted change: what it did to the page, and who it came from.
 *
 * The revision leads because it is the entry's identity — `revision - 1` is what
 * it applied to, so a log read this way is a chain rather than a list of events
 * that happen to be sorted. The number stays, and so does every other name on
 * this row: 22 August settled that a plain sentence describes a *class* of
 * thing, and what tells two rows apart is the name.
 *
 * What changed is the wording. The row used to open with `revision 4` and a raw
 * `2026-08-09T12:00:00.000Z`, list its operations as `reconfigure n_head title`,
 * and close with five monospace pairs headed `asked by`, `allowed by`,
 * `interpreted by`, `confidence` and `proposal`. Every one of those facts is
 * still on this row. Four of the five pairs are behind the disclosure at the
 * foot, the operations are read as sentences with the raw delta beside them, and
 * the two things a reader actually came for — what happened to the page, and
 * what undoing it would put back — are the first two things they meet.
 *
 * Provenance is shown in full rather than summarised. 0016 said the log is what
 * makes 0001's claim real: a stored tree can say what it is, but only a log can
 * say who changed it, when, and why — and a view that dropped the interpreter or
 * the confidence would be keeping the record without showing it.
 *
 * Who allowed it appears only when there is one, and its absence is deliberately
 * silent — see `whoAllowed`. `Allowed by nobody` would state as fact one of two
 * things the revision cannot tell apart (0029).
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
}) => {
  const view = revisionView(stored)

  return (
    <li
      id={revisionAnchorId(stored.revision)}
      className={`flex scroll-mt-8 flex-col gap-3 rounded-md border p-4 ${
        anchored ? "border-edge-strong bg-surface-active" : "border-edge-subtle bg-surface-base"
      }`}
    >
      {/*
       * Stacked until there is room, rather than wrapped. `flex-wrap` put the
       * date beside the heading on one row and under it on the next at the same
       * width — a difference a phone screenshot showed and no test could.
       */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h3 className="text-sm">
          <span className="font-mono">Revision {stored.revision}</span>
        </h3>
        <time className="text-ink-muted text-2xs" dateTime={stored.appliedAt}>
          {plainMoment(stored.appliedAt)}
        </time>
      </div>

      {/*
       * What it did to the page, first and as sentences. This is the answer to
       * the only question somebody opens History with, and it used to arrive
       * third, in the delta model's own verbs.
       */}
      <ul className="flex flex-col gap-1">
        {view.changes.map((change, index) => (
          <li
            key={`${change.subject}-${index}`}
            className="border-edge-subtle border-l-2 pl-3 text-xs"
          >
            {change.before}
            <span className="font-mono">{change.subject}</span>
            {change.after}
          </li>
        ))}
      </ul>

      {/*
       * Who, second — the sentence that makes the change mean something. The
       * wording is Activity's, deliberately: the two screens describe the same
       * act from two sides and a reader follows a revision link between them.
       */}
      <p className="text-ink-muted text-xs">
        {/*
         * Three sentences the row sets side by side, so the spaces between them
         * are written rather than implied. An implicit one did not survive a
         * production build on 24 August and rendered as a dropped word.
         */}
        {view.who}
        {view.allowed !== undefined && (
          <>
            {" "}
            {view.allowed}
          </>
        )}{" "}
        {view.sure}
      </p>

      {reversal !== undefined && <ReversalNote reversal={reversal} />}

      {(reversal === undefined || reversal.kind === "revertable") && (
        <UndoButton treeId={stored.treeId} revision={stored.revision} />
      )}

      {/*
       * Everything the row used to print at a reader unasked, and the raw delta
       * the sentences above are a reading of. Nothing here has left the page —
       * a reviewer checking the portal's wording against the record needs the
       * operations exactly as the delta model states them, and somebody grepping
       * the log searches for the proposal id.
       */}
      <TechnicalDetail summary="What the record says">
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          {/*
           * `asked by` fell back to the origin when no actor was recorded, and
           * the pair below prints the origin anyway — so a system-signal
           * revision showed `asked by system-signal · origin system-signal`,
           * the same value twice under two labels that promise different
           * things. A screenshot caught it. Nothing is lost: the origin is
           * still here, once.
           */}
          {stored.provenance.actor !== undefined && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">asked by</dt>
              <dd className="font-mono">{stored.provenance.actor}</dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt className="text-ink-muted">origin</dt>
            <dd className="font-mono">{stored.provenance.origin}</dd>
          </div>
          {stored.answeredBy !== undefined && (
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
            <dt className="text-ink-muted">authored by</dt>
            <dd className="font-mono">{stored.provenance.authoredBy}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">confidence</dt>
            <dd className="font-mono">{stored.provenance.confidence.toFixed(2)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">proposal</dt>
            <dd className="font-mono">{stored.proposalId}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">applied</dt>
            <dd className="font-mono">{stored.appliedAt}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">operations</dt>
            <dd className="font-mono">{summariseOperations(stored.delta.operations)}</dd>
          </div>
        </dl>

        <ul className="flex flex-col gap-1">
          {stored.delta.operations.map((operation, index) => {
            const described = describeOperation(operation)

            return (
              <li
                key={`${described.subject}-${index}`}
                className="border-edge-subtle border-l-2 pl-3"
              >
                {described.verb} <span className="font-mono">{described.subject}</span>{" "}
                <span className="text-ink-muted">{described.detail}</span>
              </li>
            )
          })}
        </ul>

        {reversal?.kind === "revertable" && (
          <p>
            An undo would apply{" "}
            <span className="font-mono">{summariseOperations(reversal.inverse)}</span>.{" "}
            {reversal.discards.length === 0
              ? "Nothing later depends on it."
              : `It writes over ${reversal.discards.length} later revision${
                  reversal.discards.length === 1 ? "" : "s"
                }.`}
          </p>
        )}

        {reversal?.kind === "blocked" && <p className="font-mono">{reversal.technical}</p>}
      </TechnicalDetail>
    </li>
  )
}
