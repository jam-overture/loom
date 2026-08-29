import {
  describeRevertOutcome,
  describeWriteOutcome,
  type RevertOutcome,
  type WriteOutcome,
} from "@loom/runtime/write"

import {
  CANNOT_UNDO,
  plainState,
  stateOfWrite,
  type ChangeState,
  type OutcomeTone,
  type PlainState,
} from "@/app/(portal)/_lib/vocabulary"

/**
 * What became of an ask, as three strings a page can render.
 *
 * The split is the whole point, and it is the plain-language rule made
 * concrete: `headline` and `meaning` are what a visitor reads without asking,
 * `detail` is the runtime's own sentence — `describeWriteOutcome`, unaltered,
 * error codes and revision numbers intact — and it belongs behind a disclosure.
 * Nothing is dropped to make room; it moves.
 *
 * **The words come from `(portal)/_lib/vocabulary`, deliberately.** That table
 * is what guarantees a state cannot be called "waiting on you" here and `held`
 * in the review queue, and a demo that forked it would be inventing a second
 * vocabulary for the same five runtime states. It is the one module this surface
 * reaches into another lane for, and it is filed as a finding: it is shared
 * ground rather than the portal's, and it should live somewhere that says so.
 *
 * What this file does *not* borrow is the portal's own report, and that is the
 * reason it exists. `(portal)/_lib/outcome` tells a reader of a held undo to
 * "answer it in this page's review queue", which is true of the portal and
 * false here — on the demo the hold is answered on the card in front of them.
 */

export type { OutcomeTone }
export { toneClasses } from "@/app/(portal)/_lib/vocabulary"

/**
 * The one sentence in the shared table that is written about somewhere else.
 *
 * `applied` reads *"This change is live on the page. You can undo it from
 * History."* — true in the portal, where undo is offered on `/portal/history`,
 * and wrong here twice over: a demo visitor has no account, so `/portal/history`
 * is a page they cannot open, and the undo they are being sent away to find is
 * a button on the card they are already reading.
 *
 * So the demo overrides the *meaning* and keeps the label, the tone and the
 * technical name. That is the whole shape of this: the two surfaces must agree
 * on what a state is *called* — a visitor told "Applied" and a reviewer told
 * `committed` about the same change would be two products — and they cannot
 * agree on where to go next, because they are different places.
 *
 * Anything not named here falls through to the shared table unchanged, and
 * `report.test.ts` asserts that nothing falling through sends a visitor
 * somewhere this surface does not have.
 */
const DEMO_MEANINGS: Partial<Record<ChangeState, string>> = {
  applied: "This change is live on the page beside you. “Put it back” undoes it.",
}

/** A state, in the words this surface has to say it in. */
export const demoState = (state: ChangeState): PlainState => {
  const override = DEMO_MEANINGS[state]
  const shared = plainState(state)

  return override === undefined ? shared : { ...shared, meaning: override }
}

/**
 * Whether the tree on the stage is different from the one that was there before
 * the press — one answer for every state, and `applied` is the only yes.
 *
 * A total record rather than `state === "applied"`, so a state added to the
 * shared table stops this file compiling until somebody has said which of the
 * two it is. The alternative silently defaults a new state to "the page moved",
 * which is the answer that makes a control withdraw itself, and the answer that
 * is wrong for every state on this list but one.
 *
 * `waiting` is the entry worth reading twice: the runtime did everything it was
 * asked to and the page did not move, which is the whole of what *Put it back*
 * gets wrong when nobody writes this down.
 */
const MOVED_THE_PAGE: Readonly<Record<ChangeState, boolean>> = {
  applied: true,
  waiting: false,
  refused: false,
  declined: false,
  misunderstood: false,
  "no-change": false,
  "not-saved": false,
  "already-answered": false,
  unfinished: false,
}

const movedThePage = (state: ChangeState): boolean => MOVED_THE_PAGE[state]

export type WriteReport = {
  readonly tone: OutcomeTone
  /** The plain name of the state. Shown unasked. */
  readonly headline: string
  /** One sentence a visitor can act on. Shown unasked. */
  readonly meaning: string
  /** The runtime's own account, verbatim. Belongs one click down. */
  readonly detail: string
  /**
   * Whether a card in the record says this too.
   *
   * The panel used to print its report unconditionally, and once the record
   * moved up to sit directly under the controls that produced it, the result
   * was the same green "Applied — this change is live on the page beside you"
   * twice, forty pixels apart. Two sentences saying one thing is exactly the
   * clutter that made the first version of this surface hard to read.
   *
   * So the flag is about *where the answer already is*, not about success: a
   * refusal by the Gate is recorded and belongs on its card, while a form the
   * server could not parse never reached the runtime, narrated nothing, and has
   * no card — that one has to be said by the control the visitor just used or
   * it is not said at all.
   */
  readonly recorded: boolean
  /**
   * Whether the page a visitor is looking at moved because of this.
   *
   * The distinction `recorded` cannot make, and the one *Put it back* turns on.
   * A held undo is a complete success by every measure the runtime keeps — the
   * proposal was written, custody was taken, the question was asked, and there
   * is a card for all of it — and the page is exactly where it was. A control
   * deciding whether it has anything left to offer is asking about the page,
   * not about the write, so it gets a field that says so rather than inferring
   * it from a tone or a headline.
   *
   * Derived from the state in every case, never asserted at a call site: it is
   * a fact about the outcome the runtime handed back, and a second opinion
   * about it is the drift `stateReport` exists to prevent.
   */
  readonly moved: boolean
}

/**
 * A report for a state the runtime does not hand back as an outcome.
 *
 * Answering a hold is the case: `discardHeld` returns whether it worked and
 * nothing else, so the two sentences a visitor reads are the surface's to
 * choose — and they must still be *the table's*, not two more strings written
 * at the call site. They were, once, and "You said no" was maintained in two
 * files that had no way of knowing about each other.
 */
export const stateReport = (
  state: ChangeState,
  detail: string,
  recorded: boolean
): WriteReport => {
  const plain = demoState(state)

  return {
    tone: plain.tone,
    headline: plain.label,
    meaning: plain.meaning,
    detail,
    recorded,
    moved: movedThePage(state),
  }
}

export const reportOf = (outcome: WriteOutcome): WriteReport => {
  const state = stateOfWrite(outcome.kind)
  const plain = demoState(state)

  return {
    tone: plain.tone,
    headline: plain.label,
    meaning: plain.meaning,
    detail: describeWriteOutcome(outcome),
    recorded: true,
    moved: movedThePage(state),
  }
}

/**
 * An undo's outcome.
 *
 * One case differs from an ordinary write: a plan that produced no undo at all
 * is not a write outcome, so it reads as inapplicable rather than as a refusal.
 * The runtime did not decline this — it could not compute it.
 *
 * A *held* undo needs no pointer here, which is the difference from the portal.
 * Every hold in the demo appears in the rail beside the page with its two
 * buttons on it, so telling a visitor where to go would be telling them to look
 * at what they are already looking at.
 */
export const revertReportOf = (outcome: RevertOutcome): WriteReport =>
  outcome.kind === "not-revertable"
    ? {
        tone: CANNOT_UNDO.tone,
        headline: CANNOT_UNDO.label,
        meaning: CANNOT_UNDO.meaning,
        detail: describeRevertOutcome(outcome),
        recorded: true,
        /** Loom could not work out what putting it back would mean, so nothing was put back. */
        moved: false,
      }
    : reportOf(outcome)

/**
 * The form did not arrive in a shape the server could read, so nothing was
 * asked of the runtime at all. The plain half says that; the issue itself is
 * the technical half, because a validator's message is written for whoever
 * wrote the form rather than for whoever filled it in.
 */
export const invalidReport = (issue: string): WriteReport => ({
  tone: "inapplicable",
  headline: "Nothing was sent",
  meaning: "That didn't reach Loom, so nothing on the page has changed.",
  detail: issue,
  recorded: false,
  moved: false,
})
