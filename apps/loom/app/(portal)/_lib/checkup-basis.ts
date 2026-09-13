import type { AuditTone } from "./audit-view"

/**
 * What a checkup actually compared, and the one thing it took on trust.
 *
 * The verdict on this screen is a comparison of **three** things: the shape
 * this deployment holds for the page, the changes it has recorded since, and
 * the page being served right now. Both plain-language verdicts were written as
 * though there were two.
 *
 * - *"…so nothing on it is unexplained"* promises the history is intact. The
 *   audit cannot support that, because **it compares end states rather than
 *   histories** — filed by `Loom lessons` on 25 August with the counterexample
 *   executed as Exercise D of lesson 16. Audit against a seed that is wrong at
 *   one text node: `diverged`, correctly. Append a change that removes the
 *   element that node lived in. Audit again against the same wrong seed:
 *   **`agrees`**. Nothing was fixed; the revision that exposed the drift
 *   deleted the evidence, and every audit after it comes back green.
 * - *"One of the two is wrong"* is the same error under a red verdict, and it
 *   is the more expensive one. It sends a reviewer to look at the log and the
 *   page when the fault may be in neither.
 *
 * So the fix is not to soften the reassurance. It is to **name the third
 * input**, on the surface, with the numbers that went into it — and to say
 * plainly, one click down, that the starting shape is assumed rather than
 * checked. `unauditable` on the same screen has always done this well ("a
 * checkup has to start from the shape a page was first created with, and this
 * deployment doesn't know that shape for this one"); this is the sentence the
 * other three verdicts were missing.
 *
 * Pure, and separate from `audit-view` on purpose. `describeAudit` reads a
 * `SnapshotAudit`; this reads nothing of the sort — it is what the portal knows
 * about its own inputs, and the seed's size is not something the runtime's
 * verdict carries.
 */

/**
 * The three inputs, in the order the check met them. Never the verdict — a
 * basis is what went in, and it reads the same whichever answer came out.
 */
export type BasisStepKey = "start" | "replay" | "compare"

export type BasisStep = {
  readonly key: BasisStepKey
  /** What this input is, as a question a person would ask about the check. */
  readonly heading: string
  /** The input itself, with the real number in it. Shown unasked. */
  readonly plain: string
  /** The same input in the runtime's words, for the disclosure beside it. */
  readonly technical: string
}

/**
 * The assumption nothing on this screen checks.
 *
 * Worded per verdict because the same fact has two different consequences, and
 * a reader only ever meets one of them. Under a green verdict it is *this can
 * be green and still be wrong*; under a red one it is *there is a third suspect
 * and it is not on the list below*.
 */
export type BasisAssumption = {
  readonly plain: string
  readonly technical: string
}

export type CheckupBasis = {
  readonly steps: readonly BasisStep[]
  readonly assumption: BasisAssumption
}

/**
 * The two verdicts that compared something.
 *
 * `unreplayable` is excluded at the type rather than handled, because a fold
 * that stopped part-way did not replay a number of changes anybody can print. A
 * basis saying "it replayed 12 changes" under a verdict saying "nothing could be
 * checked" would be the same class of overclaim this module exists to remove.
 */
export type ComparedTone = Exclude<AuditTone, "unreplayable">

const parts = (count: number): string => `${count} ${count === 1 ? "part" : "parts"}`

const changes = (count: number): string => `${count} ${count === 1 ? "change" : "changes"}`

const started = (startingParts: number): BasisStep => ({
  key: "start",
  heading: "Where it started",
  plain: `The shape Loom has on record for this page when it was first created — ${parts(startingParts)}.`,
  technical:
    "The seed handed to auditSnapshot: revision 0, re-derived from the builder in source rather than read back from storage, so nothing that has happened to the log since can change it.",
})

/**
 * A page with nothing accepted against it is a real state and its own sentence.
 * "Every change accepted since — 0 changes" is a number where a reader expects
 * news, and the news is that there is no history here yet.
 */
const replayed = (changeCount: number): BasisStep => ({
  key: "replay",
  heading: "What it replayed",
  plain:
    changeCount === 0
      ? "Nothing yet. No change has been accepted on this page since it was created."
      : `Every change accepted since — ${changes(changeCount)}, in the order they were accepted.`,
  technical:
    changeCount === 0
      ? "The log holds no accepted delta after revision 0, so the fold is the seed itself."
      : `Revisions 1 to ${changeCount} of the log, folded in order: each delta applied to the tree the deltas before it produce.`,
})

const compared = (changeCount: number): BasisStep => ({
  key: "compare",
  heading: "What it compared against",
  plain: "The page people are being served right now.",
  technical: `The stored snapshot at revision ${changeCount} — the materialised view 0016 made the log the truth of.`,
})

const ASSUMPTIONS: Readonly<Record<ComparedTone, BasisAssumption>> = {
  agrees: {
    plain:
      "A green result does not prove the starting shape above is right. That shape is assumed, not checked — so if Loom held the wrong one for this page, and a later change replaced the part it was wrong about, this check would come back green anyway.",
    technical:
      "auditSnapshot compares end states, not histories. A seed that has drifted from the tree it actually created produces diverged only for as long as the node it differs at is still in the tree; the revision that removes that node also removes the evidence, and every audit after it agrees.",
  },
  diverged: {
    plain:
      "Three things went into this and the starting shape above is one of them. It is assumed rather than checked — so this disagreement can mean the page is wrong, or the recorded changes are wrong, or that Loom simply holds the wrong starting shape for this page.",
    technical:
      "auditSnapshot compares end states, not histories. The differences below are between the stored snapshot and the fold of this seed over this log; they establish that the three do not agree, and not which of the three is at fault.",
  },
}

/**
 * Total over `ComparedTone` by its type, so a fourth audit outcome added to the
 * runtime fails the build here rather than rendering a screen with no
 * assumption on it.
 */
export const assumptionOf = (tone: ComparedTone): BasisAssumption => ASSUMPTIONS[tone]

export const checkupBasis = ({
  tone,
  startingParts,
  changeCount,
}: {
  readonly tone: ComparedTone
  /** Nodes in the seed, root included. The portal's word for a node is "part". */
  readonly startingParts: number
  /** Accepted changes, which is the head revision (0016). */
  readonly changeCount: number
}): CheckupBasis => ({
  steps: [started(startingParts), replayed(changeCount), compared(changeCount)],
  assumption: assumptionOf(tone),
})
