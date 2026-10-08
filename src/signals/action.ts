import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import type { PageReading, PartReading } from "./parts.js"

/**
 * What readers *did* on a page, rather than what they saw.
 *
 * Every reading in this subsystem so far is about attention. [`parts.ts`](parts.ts)
 * answers which parts came into view, [`progress.ts`](progress.ts) where the
 * reading stops, [`pace.ts`](pace.ts) whether there was time to take a part in,
 * [`copy.ts`](copy.ts) how many of the page's words got reached. A tally has
 * carried `engaged`, `activations`, `opens`, `closes` and `completions` since
 * the counters existed, and **nothing interpreted any of them.** They were
 * summed into a role row (0212) and otherwise sat there: a deployment could see
 * that a band was read and had no way to ask whether anybody did anything in it.
 *
 * So this answers *four in ten readers who got to the pricing band did
 * something in it, and nobody touched the one below it*. It is the tenth thing
 * taken out of the server-side join rather than collected: **nothing is added
 * to a payload, a browser, a column, a store or the vocabulary**, and the
 * broadcaster is not touched. It is also the second thing here that tells a
 * model something to act on rather than telling a person something true
 * — where reading stops was the first (0221) — and *readers reach this band
 * and touch nothing* is a
 * sentence a proposal can be written from.
 *
 * ## The one rule everything else follows from
 *
 * **`engaged` is structurally zero on a part with no element children**, and a
 * share built from it is therefore not a measurement of anything.
 *
 * A press is filed against the control, and `engaged` counts the views whose
 * reader did something *strictly inside* a node (0167). A leaf has no inside.
 * So a heading, a paragraph and a button alike report `engaged: 0` for ever —
 * the button because the press is its own `activations`, the heading because
 * there was never anything to press. Dividing that nought by `reached` would
 * print *0% of readers acted here* against every text node on the page, which
 * is a filing rule misread as a finding about readers (0167).
 *
 * {@link PartAction.share} is therefore **withheld on a leaf**, and
 * {@link ActionStanding} `untouched` is said of nothing else. What a leaf
 * reports instead is {@link PartAction.uses} — the occurrences filed against it
 * — which is defined for every part and is a count of actions rather than of
 * readers.
 *
 * ## The two numbers that must not be divided into each other
 *
 * `engaged` and `reached` are **distinct page view counts off one row**, so
 * their ratio is sound for the reason a fall between two siblings is (0221): a
 * reader who straddled a rollup window straddled it for the whole page, so the
 * over-count the counts carry (0147) is very nearly common to the numerator and the
 * denominator and divides out. *Four in ten readers did something here*
 * survives an inflation that *four hundred readers* does not.
 *
 * `activations`, `opens`, `closes` and `completions` are **occurrences**. A
 * reader who presses twice is two of them and one person, so they are not a
 * count of readers and `uses ÷ reached` is not a rate: it is published as
 * {@link PartAction.usesPerReader}, it may exceed 1, and it is named for what
 * it is. A share of *readers who pressed this button* is not available from any
 * counter the vocabulary has, and the only honest place to ask it is the band
 * the button is inside.
 *
 * ## What it cannot tell apart, and whose that is
 *
 * A leaf readers reached with no uses against it is a button nobody pressed or
 * a heading nobody could press, and nothing in the tree says which: `role`
 * declares one member today and it is not *a control* (0238). That is the
 * finding of 6 October, owned by `Loom primitives`, showing up in a second
 * place — and it is why a leaf is `unknown` here rather than `untouched`.
 *
 * Pure, linear in the parts, and reaches no store, clock or DOM, so it adds
 * nothing to the broadcaster's import graph.
 */

/**
 * What a window can say about whether readers acted on one part.
 *
 * Three members for the reason the part standings have three (0212): a
 * two-valued reading has to call a part
 * nobody could have acted on a part nobody acted on, and those are the two
 * sentences a reader screen must never print over each other.
 */
export type ActionStanding =
  /** A row credits it with readers who acted inside it, or with uses of its own. */
  | "acted"
  /**
   * Readers reached it, it has an inside, and nothing happened in or on it.
   *
   * The only claim this module makes about an absence, and the sentence worth
   * acting on.
   */
  | "untouched"
  /**
   * Nothing can be said.
   *
   * A part with no row at all, a part whose `reached` is 0 while the window held
   * views — the unanchorable case (0221), where it reported something other than coming
   * into view), or **a leaf**, whose nought is a filing rule rather than a
   * measurement.
   */
  | "unknown"

export const ACTION_STANDINGS: readonly ActionStanding[] = everyMemberOf<ActionStanding>()([
  "acted",
  "untouched",
  "unknown",
])

export const describeActionStanding = (standing: ActionStanding): string => {
  switch (standing) {
    case "acted":
      return "readers did something in or to this part"
    case "untouched":
      return "readers reached this part and did nothing in it"
    case "unknown":
      return "nothing in the window can say whether readers acted here"
  }
}

/** One element node of one revision, and what readers did with it. */
export type PartAction = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** 0 at the root. */
  readonly depth: number
  /** null at the root. */
  readonly parentId: NodeId | null
  readonly standing: ActionStanding
  /**
   * Whether any element part of this revision names it as a parent.
   *
   * The structural fact that decides whether a share is a measurement. Taken
   * off the tree the reading was built from, so it is a property of the page
   * and not of the window — a part with children keeps them in a window nobody
   * read.
   */
  readonly bearsParts: boolean
  /** Distinct page views that reported it coming into view, or `undefined` where no row named it. */
  readonly reached: number | undefined
  /**
   * Distinct page views in which a reader used something strictly inside it
   * (0167), or `undefined` where no row named it.
   *
   * `0` on a leaf is a filing rule and not a measurement; {@link share} is what
   * is withheld on account of it, and this number is passed through unaltered
   * because a caller looking at one part's row should see what the store holds.
   */
  readonly within: number | undefined
  /**
   * `within ÷ reached`, in `[0, 1]`, or `undefined`.
   *
   * Withheld where the part bears no element parts, where no row named it, and
   * where its `reached` is 0 — which are the three states the standing of
   * `unknown` covers, so a withheld share and an unknown standing are the same
   * fact said twice and never disagree.
   *
   * Both terms are distinct view counts off the same row, which is why this is
   * the figure on a card that can be trusted while the counts beside it are
   * generous by the straddle, measured since the door counted openings
   * (0147, 0219). It is deliberately
   * **not** divided by the page views counted at the door: `opened` and
   * `engaged` are written in different places and their ratio can honestly
   * exceed 1, which is a refusal made once already (0221) and it still stands.
   */
  readonly share: number | undefined
  /**
   * Presses, opens, closes and submissions filed against this part itself,
   * added.
   *
   * **Occurrences, never readers.** Four counters go in because they are four
   * ways of using a thing and a caller asking *was this used* wants one number;
   * the four are on {@link PartAction.counts} apart for a caller that wants to
   * tell a press from a dismissal. `0` where no row named it, because *nothing
   * happened* and *nothing was reported* are told apart by the standing rather
   * than by making every arithmetic consumer handle an absence.
   */
  readonly uses: number
  /** The four occurrence counters, kept apart. `0` each where no row named it. */
  readonly counts: {
    readonly activations: number
    readonly opens: number
    readonly closes: number
    readonly completions: number
  }
  /**
   * `uses ÷ reached`, or `undefined` where nothing was used or nobody reached
   * it.
   *
   * **An intensity and not a rate.** It may exceed 1, and above 1 it says
   * readers used this part more than once each rather than that more readers
   * used it than reached it. Withheld at `uses` of 0 rather than published as a
   * nought, because a nought here is the ordinary state of every heading on the
   * page and {@link uses} already says it.
   */
  readonly usesPerReader: number | undefined
  /**
   * `closes ÷ opens`, or `undefined` where nothing was opened.
   *
   * *Readers open this ask and shut it again nine times in ten* — two
   * occurrence counts off one row, so the straddle divides out of it the way it
   * does out of {@link share}.
   *
   * **Uncapped on purpose.** Above 1 means closes the page's own opens cannot
   * account for, which is a disclosure a revision renders already open: the
   * reader shuts something they never opened. Capping it would hide the one
   * state it can diagnose, and a clause nothing can falsify is not a safeguard
   * (0231).
   */
  readonly shutAgain: number | undefined
}

export type PageAction = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The page's view floor, carried through from the reading unchanged.
   *
   * Zero makes every standing `unknown`: nothing was measured, so nothing was
   * left untouched.
   */
  readonly views: number
  /** Every element part of the revision, in reading order. */
  readonly parts: readonly PartAction[]
  readonly standings: Readonly<Record<ActionStanding, number>>
  /**
   * The root, which is the one page-wide headcount this subsystem has.
   *
   * Every action anywhere on the page is strictly inside the root, and the root
   * is an addressed node reached by every view that renders — so its `within` is
   * **the distinct page views in which a reader did anything at all**, counted
   * once, off one row. *Three in ten readers did something on this page* is one
   * division and is the sentence a reader screen opens with.
   *
   * It is the only page-level total here and it is not an addition. Summing
   * `within` across parts would charge one reader once per level of the tree
   * they acted inside (0147, 0167), so there is no page total of readers who
   * acted and this is what stands in for one.
   *
   * Kept out of {@link mostIgnored}, because the page contains every part it
   * would outrank, which is how the pace reading treats it (0230) and for the
   * same reason.
   *
   * `null` where the revision's root is not an element.
   */
  readonly whole: PartAction | null
  /**
   * The part the most readers reached and did nothing in: most reached, then
   * first in reading order.
   *
   * By headcount rather than by share (0221), which is the ranking rule spelled
   * once: a band two readers out of three ignored is a worse ratio and a smaller
   * problem than one four hundred of them did.
   *
   * `null` where nothing is `untouched`.
   */
  readonly mostIgnored: PartAction | null
  /**
   * Parts with no element parts under them, whose share is withheld for the
   * structural reason.
   *
   * Published so a reading accounts for every part rather than leaving a caller
   * to wonder where the shares went. What is withheld is still reported as a
   * total (0214). On an ordinary page it is most of the page.
   */
  readonly leaves: number
  /**
   * Whether the window holds uses and credits them to nobody.
   *
   * True where some part reports an occurrence and **no** part reports a reader
   * inside it. A press is filed against the control and credited to its
   * addressed ancestors from the ancestry the signal carries, so a batch whose
   * delegated signals have no `within` adds occurrences and no `engaged` at all
   * — a sender synthesising batches on a server, replaying a fixture, or with
   * the walk turned off.
   *
   * It matters because the symptom is otherwise *a page readers act on and
   * nothing can say where*: every {@link share} on the page is a nought, every
   * band reads `untouched`, and the counters look healthy. §11's `unopened`
   * diagnosis one counter across, and nothing else here would say so.
   */
  readonly unwalked: boolean
}

const NO_STANDINGS: Readonly<Record<ActionStanding, number>> = Object.freeze({
  acted: 0,
  untouched: 0,
  unknown: 0,
})

const NO_COUNTS = Object.freeze({
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

/**
 * Which parts have element parts under them, in one pass over the reading.
 *
 * A part bears children exactly where another part names it as a parent, and
 * every element node of the revision is in the list — so this is a set of
 * parent ids rather than a walk of the tree, and the tree is not read again.
 * Linear rather than a lookup per part: the ledger was quadratic once and a
 * 6,000-node page took 314 ms.
 */
const parentsIn = (parts: readonly PartReading[]): ReadonlySet<NodeId> => {
  const parents = new Set<NodeId>()

  for (const part of parts) if (part.parentId !== null) parents.add(part.parentId)

  return parents
}

/**
 * One part's standing, which is the whole of this module's honesty in nine
 * lines.
 *
 * Ordered so that a claim is only ever reached after everything that would make
 * it unsayable has been ruled out: an absent row first, then an action of any
 * kind, then the structural withholding, then the unanchorable `reached` of 0.
 */
const standingOf = (
  counters: PartReading["counters"],
  uses: number,
  bearsParts: boolean
): ActionStanding => {
  if (counters === undefined) return "unknown"
  if (counters.engaged > 0 || uses > 0) return "acted"
  if (!bearsParts) return "unknown"
  if (counters.reached === 0) return "unknown"

  return "untouched"
}

const actionOf = (part: PartReading, parents: ReadonlySet<NodeId>): PartAction => {
  const bearsParts = parents.has(part.nodeId)
  const counts =
    part.counters === undefined
      ? NO_COUNTS
      : {
          activations: part.counters.activations,
          opens: part.counters.opens,
          closes: part.counters.closes,
          completions: part.counters.completions,
        }
  const uses = counts.activations + counts.opens + counts.closes + counts.completions
  const reached = part.counters?.reached
  const within = part.counters?.engaged

  return {
    nodeId: part.nodeId,
    type: part.type,
    role: part.role,
    depth: part.depth,
    parentId: part.parentId,
    standing: standingOf(part.counters, uses, bearsParts),
    bearsParts,
    reached,
    within,
    share:
      bearsParts && reached !== undefined && reached > 0 && within !== undefined
        ? within / reached
        : undefined,
    uses,
    counts,
    usesPerReader: uses > 0 && reached !== undefined && reached > 0 ? uses / reached : undefined,
    shutAgain: counts.opens > 0 ? counts.closes / counts.opens : undefined,
  }
}

/**
 * The more ignored of two, which is the ranking rule spelled once.
 *
 * Most readers reached, then the earlier in reading order — and the caller
 * folds in reading order, so `>` rather than `>=` keeps the first of a tie.
 */
const moreIgnoredOf = (standing: PartAction | null, next: PartAction): PartAction =>
  standing === null || (next.reached ?? 0) > (standing.reached ?? 0) ? next : standing

/**
 * What readers did on one revision of one page, off the reading of
 * [`parts.ts`](parts.ts) and nothing else.
 *
 * Takes the same `PageReading` every other reading here takes, so a caller that
 * has built one has already paid for the join: no store read, no second walk of
 * the tree, and the counters are the ones already in hand.
 */
export const pageActionOf = (reading: PageReading): PageAction => {
  const parents = parentsIn(reading.parts)
  const parts = reading.parts.map((part) => actionOf(part, parents))

  const standings: Record<ActionStanding, number> = { ...NO_STANDINGS }
  let whole: PartAction | null = null
  let mostIgnored: PartAction | null = null
  let leaves = 0
  let anyUse = false
  /**
   * Whether *any* part credits a reader with acting inside it — a presence test
   * and deliberately not a sum. Adding `within` across parts would charge one
   * reader once per level they acted inside (0147, 0167), and a number nobody
   * should add is a number not worth computing.
   */
  let anyWithin = false

  for (const part of parts) {
    standings[part.standing] += 1

    if (part.depth === 0 && whole === null) whole = part
    if (!part.bearsParts) leaves += 1
    if (part.uses > 0) anyUse = true
    if ((part.within ?? 0) > 0) anyWithin = true

    if (part.standing === "untouched" && part !== whole) {
      mostIgnored = moreIgnoredOf(mostIgnored, part)
    }
  }

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    views: reading.views,
    parts,
    standings,
    whole,
    mostIgnored,
    leaves,
    unwalked: anyUse && !anyWithin,
  }
}
