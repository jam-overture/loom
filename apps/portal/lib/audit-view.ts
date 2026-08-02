import { assertNever, compareTrees, type NodeFacet, type TreeDifference } from "@loom/runtime"
import type { ReplayMismatch, SnapshotAudit } from "@loom/runtime/store"

import type { OutcomeTone } from "./outcome"

/**
 * A snapshot audit, in the words a reviewer reads.
 *
 * The runtime answers "do the log and the snapshot agree" (0016). That verdict
 * is the whole point and it is not, on its own, something anyone can act on:
 * "diverged" says the record of what happened no longer produces what is being
 * served, and says nothing about what to do next. So the page shows the verdict
 * and, when it is bad news, exactly which nodes disagree.
 *
 * Pure, and no React: the wording of an audit is the part worth testing, and a
 * component that both computed and rendered it would only be testable through a
 * renderer.
 */

export type AuditTone = "agrees" | "diverged" | "unreplayable"

export type AuditReport = {
  readonly tone: AuditTone
  readonly headline: string
  /** Why the verdict is what it is, and what it means for the tree being served. */
  readonly detail: string
  readonly differences: readonly TreeDifference[]
  /**
   * How many differences were found beyond the ones listed. Never silently
   * dropped: a report that truncated without saying so would read as a short
   * list of problems rather than the start of a long one.
   */
  readonly omitted: number
}

/**
 * A drifted tree can differ at every node, and a page that rendered all of them
 * would be a worse way to learn that than a number. The first few are enough to
 * recognise the shape of the problem; the count is enough to know its size.
 */
export const DIFFERENCE_LIMIT = 25

/**
 * An audit verdict borrows the portal's existing outcome palette rather than
 * introducing a second one. A reviewer already reads `applied` as "this went
 * through" and `rejected` as "this did not"; a new set of colours meaning
 * roughly the same things would be one more thing to learn.
 *
 * `unreplayable` is `uninterpreted` and not `rejected` on purpose: the same
 * distinction the activity view already draws between an answer nobody liked and
 * no answer at all.
 */
const AUDIT_TONES: Readonly<Record<AuditTone, OutcomeTone>> = {
  agrees: "applied",
  diverged: "rejected",
  unreplayable: "uninterpreted",
}

export const toneOfAudit = (tone: AuditTone): OutcomeTone => AUDIT_TONES[tone]

const FACET_WORDS: Readonly<Record<NodeFacet, string>> = {
  kind: "what kind of node it is",
  type: "which primitive it is",
  props: "its props",
  text: "its text",
  parent: "which node it sits inside",
  position: "where it sits among its siblings",
}

export const describeFacets = (facets: readonly NodeFacet[]): string =>
  facets.map((facet) => FACET_WORDS[facet]).join(", ")

/**
 * One difference, said from the snapshot's point of view — because the snapshot
 * is what is being served, and the fold is the check. "The log does not produce
 * this node" is a statement about the thing readers are looking at.
 */
export const describeDifference = (difference: TreeDifference): string => {
  switch (difference.code) {
    case "missing":
      return "in the served tree, but replaying the log does not produce it"
    case "extra":
      return "produced by replaying the log, but absent from the served tree"
    case "changed":
      return `differs between the two in ${describeFacets(difference.facets)}`
    default:
      return assertNever(difference, "describeDifference")
  }
}

export const describeMismatch = (mismatch: ReplayMismatch): string => {
  switch (mismatch.code) {
    case "delta-rejected":
      return `revision ${mismatch.revision} no longer applies to the tree the revisions before it produce (${mismatch.detail})`
    case "revision-gap":
      return `the log jumps: revision ${mismatch.expected} was expected next, and ${mismatch.found} was found`
    default:
      return assertNever(mismatch, "describeMismatch")
  }
}

const changeCount = (revision: number): string =>
  `${revision} accepted ${revision === 1 ? "change" : "changes"}`

export const describeAudit = (audit: SnapshotAudit): AuditReport => {
  switch (audit.outcome) {
    case "agrees":
      return {
        tone: "agrees",
        headline: "The log produces the tree being served.",
        detail: `Folding ${changeCount(audit.revision)} from the seed reproduces the snapshot exactly, so the record of what happened and the thing readers see are still the same tree.`,
        differences: [],
        omitted: 0,
      }

    case "diverged": {
      const found = compareTrees(audit.stored, audit.replayed)

      return {
        tone: "diverged",
        headline: "The log no longer produces the tree being served.",
        detail: `Folding ${changeCount(audit.revision)} from the seed produced a different tree. The snapshot is what readers get; the log is what the runtime claims happened. One of them is wrong, and until that is settled the history of this tree cannot be trusted to explain it.`,
        differences: found.slice(0, DIFFERENCE_LIMIT),
        omitted: Math.max(found.length - DIFFERENCE_LIMIT, 0),
      }
    }

    case "unreplayable":
      return {
        tone: "unreplayable",
        headline: "The log cannot be replayed at all.",
        /**
         * Worse than divergence and deliberately worded that way: divergence is
         * two answers, this is none. Nothing can be compared, so nothing here
         * says whether the served tree is right.
         */
        detail: `The fold stopped before it finished, so there is no replayed tree to compare against — ${describeMismatch(audit.mismatch)}. This says nothing about whether the served tree is correct; it says the log can no longer be used to check it.`,
        differences: [],
        omitted: 0,
      }

    default:
      return assertNever(audit, "describeAudit")
  }
}
