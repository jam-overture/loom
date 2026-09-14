import {
  assertNever,
  compareTrees,
  type IdReturn,
  type NodeFacet,
  type TreeDifference,
} from "@loom/runtime"
import type { ReplayMismatch, SnapshotAudit } from "@loom/runtime/store"

import { capitalised, firstNamed, namesInTree, nounOf, type PartName } from "./part-name"

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
   * Every part the differences name, in a person's words, by id.
   *
   * A difference is a *comparison*, so unlike a row on the page screen it
   * cannot be named from itself: by definition the node is in one of the two
   * trees and not the other. The fold has both trees in hand at the moment the
   * verdict is formed, and this is the only moment it does — the page would
   * have to read the head again to get one of them back, and by then it may
   * have moved. So the names are taken here, from the pair that was actually
   * compared.
   *
   * The served tree wins a tie, which matters only for a `changed` node, since
   * that is the one kind of difference both trees hold. What people are being
   * served is the page the reader is looking at, so it is the one they can
   * check the name against.
   */
  readonly names: ReadonlyMap<string, PartName>
  /**
   * How many differences were found beyond the ones listed. Never silently
   * dropped: a report that truncated without saying so would read as a short
   * list of problems rather than the start of a long one.
   */
  readonly omitted: number
  /**
   * Ids that stopped naming one node, which is a separate finding from the
   * verdict and not a milder version of it (0038). The verdict answers whether
   * the log still produces the snapshot; this answers whether the log can be
   * read by id. A tree can pass the first and fail the second, so this is
   * reported even under "agrees".
   */
  readonly recycled: readonly IdReturn[]
  readonly recyclingOmitted: number
  /**
   * The revision the fold stopped at, and null whenever it did not stop. An
   * entry the log holds either way (see `stoppedAt`), so it is the one place a
   * reviewer given an unreplayable verdict can actually be sent.
   */
  readonly stoppedAt: number | null
  /**
   * The head revision the fold was checked against, and therefore how many
   * accepted changes went into it (0016). Null exactly when nothing was
   * compared — the mirror of `stoppedAt`, and the reason a screen can tell a
   * verdict that weighed something from one that could not.
   */
  readonly revision: number | null
  /**
   * Removals that were taken back. Counted rather than listed: an undo is the
   * expected shape of a working review queue, and a page that listed each one
   * beside a fault would read as a list of faults.
   */
  readonly restored: number
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
  name: "which slot it is",
  props: "its props",
  text: "its text",
  parent: "which node it sits inside",
  position: "where it sits among its siblings",
}

export const describeFacets = (facets: readonly NodeFacet[]): string =>
  facets.map((facet) => FACET_WORDS[facet]).join(", ")

/**
 * The same seven facets, for somebody who has not read a decision record.
 *
 * A second table rather than a rewrite of the first, and the reason is the rule
 * this whole surface is being rebuilt under: the runtime's words are not wrong
 * and they are not deleted. `props` is the name of a field, and a reviewer
 * chasing a difference wants exactly that word; a person deciding whether their
 * page is broken wants "its settings". Both are on the page, one of them behind
 * a disclosure.
 *
 * Typed as a total record, so a facet added to the runtime fails the build here
 * rather than rendering as `undefined` in a sentence.
 */
const PLAIN_FACET_WORDS: Readonly<Record<NodeFacet, string>> = {
  kind: "what sort of thing it is",
  type: "which building block it is",
  name: "where it plugs in",
  props: "its settings",
  text: "its words",
  parent: "what it sits inside",
  position: "where it sits among the things around it",
}

export const explainFacets = (facets: readonly NodeFacet[]): string =>
  facets.map((facet) => PLAIN_FACET_WORDS[facet]).join(", ")

/**
 * One difference, for the person who opened the page.
 *
 * `describeDifference` below says the same thing in the runtime's vocabulary and
 * is kept verbatim — "the served tree", "replaying the log" — because that is
 * the sentence a reviewer chasing this down needs. This is the sentence somebody
 * needs to know whether to care.
 *
 * Both are written from the page's point of view rather than the fold's, for the
 * reason the technical one already was: the page is the thing readers are
 * looking at, and a difference is news about it.
 */
export const explainDifference = (difference: TreeDifference): string => {
  switch (difference.code) {
    case "missing":
      return "It is on the page people are being served, and nothing in the recorded history put it there."
    case "extra":
      return "The history says this should be on the page, and it is not."
    case "changed":
      return `The page and the history disagree about ${explainFacets(difference.facets)}.`
    default:
      return assertNever(difference, "explainDifference")
  }
}

/** No tree was compared, so there is nothing to name. */
const NO_NAMES: ReadonlyMap<string, PartName> = new Map()

/**
 * What to call the part one difference is about.
 *
 * The list under *This page does not match its own history* printed
 * `difference.label` on its surface — the runtime's own word for the part,
 * `loom.footer`, in monospace, on the one screen somebody opens when they
 * already think something is wrong. It is the same defect the page screen's
 * rail had on 12 September and it wanted a different fix, because a rail holds
 * nodes and a difference holds only the id of one.
 *
 * The words are what tell two rows apart. A page with four cards on it produces
 * four rows reading *Card* and one reading *The card “Autumn arrivals”*, and
 * only the second says which card to go and look at — which is why this is the
 * subject shape (`partNameOf`) rather than the place shape the rail uses.
 *
 * **The fallback is the runtime's label, read as words rather than printed.**
 * A difference always comes out of one of the two trees, so a name is always
 * found in practice; if one ever is not, `loom.footer` still says *the footer*,
 * which is less than the words and more than nothing. No row can end up with no
 * name at all.
 */
export const nameOfDifference = (
  names: ReadonlyMap<string, PartName>,
  difference: TreeDifference
): PartName => ({
  name: capitalised(names.get(difference.nodeId)?.name ?? `the ${nounOf(difference.label)}`),
  nodeId: difference.nodeId,
})

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

/**
 * The revision the fold stopped at.
 *
 * Both mismatches name more than one number and only one of them is a place. A
 * rejected delta stopped the fold at itself. A gap names the revision that was
 * *expected* — which by definition no entry holds, so it is a description of
 * absence — and the one that was found, which is the entry a reviewer can go and
 * read. Linking the expected one would be offering a reviewer a door into the
 * hole in the log.
 */
export const stoppedAt = (mismatch: ReplayMismatch): number => {
  switch (mismatch.code) {
    case "delta-rejected":
      return mismatch.revision
    case "revision-gap":
      return mismatch.found
    default:
      return assertNever(mismatch, "stoppedAt")
  }
}

const changeCount = (revision: number): string =>
  `${revision} accepted ${revision === 1 ? "change" : "changes"}`

/**
 * A recycled id is only worth reading if it says which two nodes are involved,
 * because the question a reviewer has is "which of these is the one I am looking
 * at" and the id alone cannot answer it.
 *
 * Split around its two revisions rather than returned whole, for the reason a
 * credit is (0043). These are the two changes that made the id ambiguous, and a
 * finding that named them without reaching them would leave the reviewer to
 * retype both. `middle` carries its own leading punctuation, so the parts join
 * with a single space between each and the revision that follows it.
 */
export type RecyclingAccount = {
  readonly opening: string
  readonly leftAt: number
  readonly middle: string
  readonly returnedAt: number
}

export const describeRecycling = (found: IdReturn): RecyclingAccount =>
  found.code === "recycled"
    ? {
        opening: `was a ${found.leftAs} until`,
        leftAt: found.leftAt,
        middle: `, and a ${found.returnedAs} from`,
        returnedAt: found.returnedAt,
      }
    : {
        opening: "was removed at",
        leftAt: found.leftAt,
        middle: " and put back at",
        returnedAt: found.returnedAt,
      }

/**
 * What the two nodes sharing one name were, in words.
 *
 * The runtime records what a returning id *was* and what it *came back as* by
 * label — `loom.card`, then `text` — and `describeRecycling` above prints them
 * verbatim, which is right for the technical reading and is the second place on
 * this screen a registered type was reaching the surface.
 *
 * A recycled id cannot be named the way a difference is: both nodes are gone
 * from the tree by the time this is read, so there is nothing to ask what it
 * said. The label is all there is, and the noun inside it is the honest plain
 * reading of it.
 *
 * `text` is the one label that is not a registered type — it is the runtime's
 * word for a node that only has words — so it gets the article dropped rather
 * than being called *a text*, which is not something anybody says.
 */
const recycledAs = (label: string): string => (label === "text" ? "words" : `a ${nounOf(label)}`)

export const explainRecycling = (found: IdReturn): RecyclingAccount =>
  found.code === "recycled"
    ? {
        opening: `was ${recycledAs(found.leftAs)} until`,
        leftAt: found.leftAt,
        middle: `, and ${recycledAs(found.returnedAs)} from`,
        returnedAt: found.returnedAt,
      }
    : describeRecycling(found)

/** Long enough to see the shape of the problem, short enough to read. */
export const RECYCLING_LIMIT = 10

type IdentityFindings = {
  readonly recycled: readonly IdReturn[]
  readonly recyclingOmitted: number
  readonly restored: number
}

const identityFindings = (idReturns: readonly IdReturn[]): IdentityFindings => {
  const recycled = idReturns.filter((found) => found.code === "recycled")

  return {
    recycled: recycled.slice(0, RECYCLING_LIMIT),
    recyclingOmitted: Math.max(recycled.length - RECYCLING_LIMIT, 0),
    restored: idReturns.length - recycled.length,
  }
}

const NO_FINDINGS: IdentityFindings = { recycled: [], recyclingOmitted: 0, restored: 0 }

export const describeAudit = (audit: SnapshotAudit): AuditReport => {
  switch (audit.outcome) {
    case "agrees":
      return {
        tone: "agrees",
        headline: "The log produces the tree being served.",
        detail: `Folding ${changeCount(audit.revision)} from the seed reproduces the snapshot exactly, so the record of what happened and the thing readers see are still the same tree.`,
        differences: [],
        names: NO_NAMES,
        omitted: 0,
        stoppedAt: null,
        revision: audit.revision,
        ...identityFindings(audit.idReturns),
      }

    case "diverged": {
      const found = compareTrees(audit.stored, audit.replayed)

      return {
        tone: "diverged",
        headline: "The log no longer produces the tree being served.",
        detail: `Folding ${changeCount(audit.revision)} from the seed produced a different tree. The snapshot is what readers get; the log is what the runtime claims happened. One of them is wrong, and until that is settled the history of this tree cannot be trusted to explain it.`,
        differences: found.slice(0, DIFFERENCE_LIMIT),
        names: firstNamed(namesInTree(audit.stored), namesInTree(audit.replayed)),
        omitted: Math.max(found.length - DIFFERENCE_LIMIT, 0),
        stoppedAt: null,
        revision: audit.revision,
        ...identityFindings(audit.idReturns),
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
        /** Nothing was replayed, so there is no second tree and no comparison to name. */
        names: NO_NAMES,
        omitted: 0,
        stoppedAt: stoppedAt(audit.mismatch),
        /** Nothing was compared, so there is no revision this verdict is about. */
        revision: null,
        /** A fold that stopped saw part of the log, and part of a history is not one. */
        ...NO_FINDINGS,
      }

    default:
      return assertNever(audit, "describeAudit")
  }
}

/**
 * The verdict, as an answer to the question somebody opened the page with.
 *
 * `describeAudit` above is unchanged and is still the technical reading: it says
 * *"Folding 12 accepted changes from the seed reproduces the snapshot exactly"*,
 * which is true, precise, and meaningless to anybody who has not read 0016. This
 * is the same three outcomes said to a person, plus the one thing the technical
 * reading has never offered — **what to do about it**.
 *
 * Derived from the report rather than from the runtime's `SnapshotAudit`, so the
 * two readings cannot describe different audits, and so this one can see the
 * findings the verdict alone does not cover.
 *
 * That last part is the case worth naming. A tree can agree with its own history
 * and still have ids that name two nodes (0038) — the fold checks whether the
 * history produces the page, and recycling is a separate question about whether
 * the history can be *read*. So a green verdict over a warning would be a screen
 * that says "nothing to do" above something to do. When there is recycling, the
 * next move names it; the tone stays green, because the fold really did agree.
 */
export type CheckupVerdict = {
  readonly tone: OutcomeTone
  /** The answer, in one line. Shown unasked; never a runtime word. */
  readonly label: string
  /** Why that is the answer, for somebody who has read nothing. */
  readonly meaning: string
  /** What to do now. Every screen owes a reader this one. */
  readonly next: string
}

const nothingToDo = (report: AuditReport): string => {
  const found = report.recycled.length + report.recyclingOmitted

  if (found === 0) return "Nothing to do."

  return found === 1
    ? "One thing to look at: a name below is used for more than one part of the page. What people see is unaffected."
    : `One thing to look at: ${found} names below are each used for more than one part of the page. What people see is unaffected.`
}

export const readCheckup = (report: AuditReport): CheckupVerdict => {
  switch (report.tone) {
    case "agrees":
      return {
        tone: toneOfAudit("agrees"),
        label: "Everything on this page adds up.",
        /**
         * *"…so nothing on it is unexplained"* was the previous clause, and it
         * promised the thing a reader wants — the history is intact — rather
         * than the thing that was checked. A fold compares end states, so a
         * deployment holding a wrong starting shape sits on a green verdict
         * from the moment a change replaces the part it was wrong about.
         * `checkup-basis.ts` carries the counterexample and the reasoning; the
         * sentence's own job is to stop claiming more than the fold did, which
         * it does by naming the starting shape it began from.
         */
        meaning:
          "Loom started from the shape it has on record for this page, replayed every change it has recorded since, and got back exactly the page people are being served.",
        next: nothingToDo(report),
      }

    case "diverged":
      return {
        tone: toneOfAudit("diverged"),
        label: "This page does not match its own history.",
        /**
         * *"One of the two is wrong"* is the same miscount under a red verdict,
         * and it is the more expensive one: it sends a reviewer to look at the
         * log and the page when the fault may be in the starting shape, which
         * is in neither.
         */
        meaning:
          "Starting from the shape Loom has on record for this page and replaying every change since produces a different page from the one people are being served. Until you know which of them is wrong, the history cannot explain what is on screen.",
        next: "The parts listed below are where the two disagree. Start there.",
      }

    case "unreplayable":
      return {
        tone: toneOfAudit("unreplayable"),
        label: "The history has a break in it, so nothing could be checked.",
        meaning:
          "Loom could not replay this page's changes all the way through, so there was nothing to compare the page against. That does not mean the page is wrong — it means its own history can no longer be used to check it.",
        next: "Open the change it stopped at, below, and see what happened there.",
      }

    default:
      return assertNever(report.tone, "readCheckup")
  }
}
