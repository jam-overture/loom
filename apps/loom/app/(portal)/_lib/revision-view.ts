import type { StoredRevision } from "@loom/runtime/store"

import { plainOperation } from "./delta-summary"
import type { PartName } from "./part-name"
import { ASK_ORIGINS, confidenceWord, NO_CONFIDENCE_TO_JUDGE, type PlainLine } from "./vocabulary"

/**
 * One accepted change, read as sentences.
 *
 * `/portal/history` was the last screen in the runtime's voice. What it printed
 * about a revision was five monospace pairs under the labels `asked by`,
 * `allowed by`, `interpreted by`, `confidence` and `proposal` — every one of
 * them true, every one of them a field name, and all five arriving at the same
 * altitude as the thing a reader came for. This is the same five facts as
 * sentences, and `RevisionRow` puts the pairs one click down rather than
 * dropping them.
 *
 * It assembles and decides nothing. Every word a reader meets comes from
 * `vocabulary` or `delta-summary`, for the reason 24 August found the hard way:
 * a screen that keeps its own words disagrees with the screen next to it, and
 * nothing can see the disagreement while each holds its own copy.
 */

/**
 * Who asked, worded exactly as Activity words it.
 *
 * The two screens describe the same act from two sides — Activity from the ask,
 * History from what the ask became — and a reader moves between them by
 * following a revision link. `ana@loom.local asked for this.` on one and
 * `asked by ana@loom.local` on the other is the same fact in two voices, which
 * is the defect the single vocabulary module exists to prevent. The full stop is
 * part of the sentence and not part of the label, for the reason the 24 August
 * screenshot found: a label set beside another sentence reads as a dropped word
 * without it.
 */
export const whoAsked = (stored: StoredRevision): string =>
  stored.provenance.actor === undefined
    ? `${ASK_ORIGINS[stored.provenance.origin].label}.`
    : `${stored.provenance.actor} asked for this.`

/**
 * Who let it through, when the log knows.
 *
 * `undefined` is not "nobody approved it", and the row's silence about it is
 * deliberate and older than this rewrite. A revision with no `answeredBy` is
 * either a change nobody had to approve or one a host approved without naming
 * the approver, and the revision cannot tell those apart — only the journal can
 * (0029). `Allowed by nobody` stated one of the two as fact, and a plain-language
 * pass is exactly the moment that temptation returns in friendlier words.
 */
export const whoAllowed = (stored: StoredRevision): string | undefined =>
  stored.answeredBy === undefined ? undefined : `${stored.answeredBy} said yes to it.`

/**
 * How sure the thing that wrote it was — and, for a runtime-authored delta, that
 * the question does not apply.
 *
 * `confidence: 1.00` on an undo is a number the calibration screen deliberately
 * ignores: only a model grades itself, and a delta the runtime computed has no
 * opinion to be right or wrong about (0007, and `authorKind` in the runtime's own
 * provenance). Printing "The AI says it is very sure" over an inverse the runtime
 * derived would be attributing a claim to a model that never made one — a
 * mistake this screen could make and Activity could not, because an undo appears
 * here and never there.
 */
export const surenessOf = (stored: StoredRevision): string =>
  stored.provenance.authoredBy === "runtime"
    ? NO_CONFIDENCE_TO_JUDGE
    : `${confidenceWord(stored.provenance.confidence)}.`

/**
 * What the change did, one plain sentence per operation, in the delta's order.
 *
 * `names` is what the screen could find out about the parts this delta touches.
 * A forward delta records what it *did* and names its subjects by id alone
 * (0016), so every name here is derived from somewhere else — the tree as it
 * stands, or the revision's own inverse for a part that no longer exists. What
 * it cannot name keeps the id, and the sentence reads as it always did.
 */
export const changesOf = (
  stored: StoredRevision,
  names: ReadonlyMap<string, PartName> = new Map()
): readonly PlainLine[] => stored.delta.operations.map((op) => plainOperation(op, names))

export type RevisionView = {
  readonly who: string
  /** Absent when the log does not know, which is not the same as nobody. */
  readonly allowed: string | undefined
  readonly sure: string
  readonly changes: readonly PlainLine[]
}

export const revisionView = (
  stored: StoredRevision,
  names: ReadonlyMap<string, PartName> = new Map()
): RevisionView => ({
  who: whoAsked(stored),
  allowed: whoAllowed(stored),
  sure: surenessOf(stored),
  changes: changesOf(stored, names),
})
