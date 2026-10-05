import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"
import { copyIn, type CopyDeclarations, type NodeCopy } from "../sdk/copy.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { outlineTree } from "../tree/outline.js"
import type { LoomTree } from "../tree/tree.js"

import type { ReaderTally } from "./rollup.js"

/**
 * What a counter is about, joined on the server from what the page already
 * knows.
 *
 * A batch names a node, a tree and a revision, and nothing else — that is rule 1
 * of [`docs/signals.md`](../../docs/signals.md) and it is not negotiable. The
 * browser therefore has two attributes on an element and no idea that `n_42` is
 * a pricing band, that its primitive declares itself a heading (0114), or which
 * of its props a reader reads (0122).
 *
 * **The server has all three.** Intake and rollup both hold the registry and the
 * tree the batch names, so `dwelled on n_42` becomes *eleven seconds on a
 * pricing band, whose words were these* with no byte added to the payload, no
 * browser change, and no new decision about what to keep.
 * [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * refused ancestry on the high-volume kinds for exactly this reason — payload
 * multiplied by page depth, to buy what the server could derive — and the same
 * argument covers roles, parts and copy.
 *
 * ## The thing only a tree can say
 *
 * Counters answer what happened. They cannot answer what *did not*, because a
 * part nobody reached has no row: absence of a tally is absence of data, and a
 * list of rows can never be read as a list of the page. The tree is the
 * universe — every element node in it is an addressed node, so every one of them
 * is a part a reader could have reached — and against that universe silence
 * becomes a measurement. *Which parts of a page are read and which are scrolled
 * past* is this join and nothing else.
 *
 * ## Why the join is at read time and not at rollup time
 *
 * Rollup also holds the tree and the registry, so it could write the role and
 * the words onto the counters as they are stored. It must not. A declaration is
 * a fact about the library, not about a window of reading: the day
 * `src/primitives/` declares `copy` across itself
 * ([0122](../../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md)
 * says nothing does yet), a read-time join reinterprets every counter already
 * stored, and a rollup-time one has baked the old silence into rows that are
 * expensive to revisit and impossible to correct for windows already expired.
 * The counters stay node-shaped for the same reason the wire does.
 *
 * The tree a reading needs is the one the counters name. For the current
 * revision that is the snapshot a store already holds; for an older one it is
 * `replayTree` over the log, which is how *before versus after a change* reaches
 * two readings.
 *
 * Pure. It is handed a tree, a window's counters and the declarations, and
 * returns a reading; it reaches no store, no clock and no DOM, and it adds
 * nothing to the broadcaster's import graph.
 */

/**
 * What a window of counters says about one part of a page.
 *
 * Three answers, and the third exists because the other two are claims. A
 * reading that only said *read* or *skipped* would have to call a page nobody
 * opened a page everybody skipped, which is the plausible-false-number failure:
 * a figure that is the right shape, drawn on a screen, and about nothing.
 *
 * **Every combination of the three is reachable except one, and the arithmetic
 * that rules it out is worth having here.** `skipped` means *no row names this
 * part*, and {@link PageReading.views} is the largest `views` any one row
 * reports — both read off the same rows. So every part being `skipped` would
 * need the window to hold no row for any part of the page, which makes `views`
 * zero, which makes every part `unknown` instead. *A page with visits, every
 * part of which went unseen* cannot be drawn from counters, and the one input
 * that produces it is a row naming a node this revision does not have — which is
 * {@link PageReading.orphaned}, and is the one state a consumer should refuse to
 * draw rather than render.
 *
 * The reachable neighbour is the one worth a screen: **rows exist and not one
 * reports reach.** A root is addressed and is in the viewport of every view that
 * draws the page, so that is a page whose parts are not reporting — a primitive
 * not spreading its identity attributes, or a sender switched on halfway through
 * a release — and not a page nobody scrolled. Filed by `Loom portal` on 2 October
 * after a test that tried to build the impossible state and could not.
 */
export type PartStanding =
  /** At least one view reported it coming into view. */
  | "read"
  /**
   * The window held views of this revision, and none of them said anything
   * about this part at all.
   *
   * It was on the page and in nobody's viewport. The one caveat is in the render
   * rather than here: a primitive that does not spread its identity attributes
   * is invisible to the broadcaster and reads as skipped, which is what
   * `sdk/conformance.ts` exists to catch.
   */
  | "skipped"
  /**
   * Nothing can be said.
   *
   * Either the window held no views of this revision — so every part is
   * unknown, and *skipped* would be a statement about readers who were not
   * there — or the part reported something other than coming into view. The
   * second is rarer and sharper: a press was delegated to a band that no
   * `viewed` ever named, so a reader plainly had it in front of them and the
   * counter that would say so is missing. Calling that skipped would be a lie
   * in the direction nobody checks.
   */
  | "unknown"

export const PART_STANDINGS: readonly PartStanding[] = everyMemberOf<PartStanding>()([
  "read",
  "skipped",
  "unknown",
])

/** One line per standing, for a surface putting the reading in front of a person. */
export const describePartStanding = (standing: PartStanding): string => {
  switch (standing) {
    case "read":
      return "came into view in at least one page view"
    case "skipped":
      return "was on the page and in nobody's viewport"
    case "unknown":
      return "nothing was reported that could say either way"
  }
}

/**
 * Which types declared each role, as a registry answers it.
 *
 * The same shape as `CopyDeclarations` and for the same reason (0122): a
 * registry built by the SDK satisfies it, and so does a two-line double in a
 * test. The inverse — a type's role — is what this module needs and is not what
 * 0114 exposes, because a role is a question asked of the vocabulary rather than
 * of a component. The vocabulary is closed and exported, so the inversion is a
 * walk of `PRIMITIVE_ROLES` rather than a method on the registry.
 */
export type RoleDeclarations = {
  readonly typesWithRole: (role: PrimitiveRole) => readonly PrimitiveType[]
}

/** Everything the join asks of a deployment. A `PrimitiveRegistry` satisfies it. */
export type PartDeclarations = CopyDeclarations & RoleDeclarations

/**
 * One element node of one revision, with whatever the window said about it.
 *
 * In reading order, with the depth and parent an outline carries, because *which
 * parts are read* is a question about a page from the top down: the shape of the
 * answer is where in the page the reading stops, and a set of rows keyed by id
 * cannot show it.
 */
export type PartReading = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** 0 at the root. */
  readonly depth: number
  /** null at the root. */
  readonly parentId: NodeId | null
  readonly standing: PartStanding
  /**
   * The counters, or `undefined` where no signal in the window named it.
   *
   * Undefined is not zero and is kept apart from it on purpose. A part with a
   * row of zeroes was reported on; a part with no row was not, and the
   * difference is the whole of how `skipped` is told from a quiet page.
   */
  readonly counters: ReaderTally | undefined
  /**
   * The words this part says itself: its declared copy props, and the text
   * handed to it directly or through a slot.
   *
   * **Its own, never its subtree's.** Neither a text node nor a slot node is an
   * element, so neither can ever be a part of its own and the words handed into
   * one would otherwise be lost; every other descendant is a part in this same
   * list. So the words of a page are
   * partitioned across its parts exactly once, and a caller may add two rows
   * together without reading a headline twice.
   *
   * `unread` and `unspoken` mean what they mean in the reading they come from
   * (0122): nobody has said whether these props are words, and somebody said
   * these were words and what is in them is not one. The starter library
   * declares `copy` across itself (0223), so `unread` on a page built from it
   * is a deployment's own primitives rather than the framework's silence.
   */
  readonly copy: NodeCopy
}

/**
 * Every part playing one role, added up.
 *
 * **Occurrences only.** `dwellMs`, `activations`, `opens`, `closes` and
 * `completions` are counts of things that happened and they add up across parts.
 * `views`, `reached` and `engaged` count *distinct page views* and are
 * deliberately absent: one reader who read three headings is three in a sum of
 * `reached` and one actual person, which is the distinctness trap 0147 already
 * wrote down one level up. What a role row says about views instead is
 * `standings` — how many of its parts were read, skipped, or cannot be spoken
 * for — which is a count of parts and cannot be mistaken for a count of readers.
 *
 * **`engaged` is absent for a second reason as well.** A press inside a band is
 * one `activations` on the button and one `engaged` on the band, by design
 * (0167). Adding both into one row would count a single reader's single action
 * twice, and the row would look right.
 */
export type RoleReading = {
  /** `null` is the row for parts whose type declared no role, which is most of a page today. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this revision playing it. */
  readonly parts: number
  readonly standings: Readonly<Record<PartStanding, number>>
  readonly dwellMs: number
  readonly activations: number
  readonly opens: number
  readonly closes: number
  readonly completions: number
}

export type PageReading = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * A floor on the page views the window held, not a count of them.
   *
   * The largest `views` any single part reports. A view that produced no signal
   * about any part is in no row at all, and distinct view counts cannot be added
   * across rows (0147), so the largest row is the most that can be said from
   * counters alone. It is a good floor in practice because a page root is an
   * addressed node and a root is in the viewport of every view that renders.
   *
   * Zero is what makes every standing `unknown`: nothing was measured, so
   * nothing was skipped.
   */
  readonly views: number
  /** Every element node, in reading order. */
  readonly parts: readonly PartReading[]
  /** Every role in the vocabulary, then the row for parts that declared none. */
  readonly roles: readonly RoleReading[]
  readonly standings: Readonly<Record<PartStanding, number>>
  /**
   * Counters handed in that are filed under another tree or another revision,
   * and were ignored.
   *
   * Adding two revisions of a node together is the mistake that makes *before
   * versus after a change* unreadable, so this filters rather than trusts its
   * caller — and says how much it dropped, because a caller who passed a whole
   * store's rows and a caller who passed the wrong revision's look identical
   * from the inside.
   */
  readonly foreign: number
  /**
   * Counters filed under this tree and revision, naming a node this tree does
   * not contain.
   *
   * The alarm for the one failure this join can have that nothing else would
   * catch: a tree and a window that do not belong together. Pass revision 7's
   * counters with revision 6's tree and most parts read `skipped` while the
   * numbers stay plausible. A non-empty list here says the pair is wrong, and
   * names the rows that prove it.
   */
  readonly orphaned: readonly NodeId[]
  /**
   * Nodes handed in more than once, where every row but the first was ignored.
   *
   * A store keeps one row per node per revision, so this cannot happen from one
   * read — it happens when a caller concatenates two windows instead of letting
   * the store add them. Neither available answer is right: summing is wrong
   * because `views`, `reached` and `engaged` count distinct views and
   * distinctness cannot be added (0147), and overwriting is wrong because the
   * later row is not the truer one. So the first row stands, the rest are
   * dropped, and the fact is reported rather than being a quiet halving of
   * somebody's dwell time.
   */
  readonly duplicated: readonly NodeId[]
}

const NO_STANDINGS: Readonly<Record<PartStanding, number>> = Object.freeze({
  read: 0,
  skipped: 0,
  unknown: 0,
})

/**
 * A type's role, inverted from the vocabulary once per reading.
 *
 * Linear in the vocabulary rather than per part: the alternative is asking
 * `typesWithRole` for every part, which is a registry call and a list scan per
 * node on a page that may have thousands.
 */
const rolesByType = (declarations: RoleDeclarations): ReadonlyMap<PrimitiveType, PrimitiveRole> => {
  const byType = new Map<PrimitiveType, PrimitiveRole>()

  for (const role of PRIMITIVE_ROLES) {
    for (const type of declarations.typesWithRole(role)) {
      /**
       * First declaration wins, and it cannot legitimately happen twice: a
       * definition carries one `role`. A registry that answered the same type
       * for two roles is wrong about something this reading cannot fix, and
       * picking the earlier keeps the answer stable rather than dependent on
       * the vocabulary's order.
       */
      if (!byType.has(type)) byType.set(type, role)
    }
  }

  return byType
}

/**
 * The children that are not parts in their own right, which is what a node
 * contributes itself.
 *
 * Text is kept and an element is dropped, because every element is a part of
 * this reading and would otherwise be counted at two depths. **A slot is kept
 * and pruned the same way**, because a slot is not an element and so is never a
 * part: text handed into one belongs to the nearest element above it, and a slot
 * treated as an element would lose those words to a node this reading never
 * reports. The words of a page are partitioned across its parts exactly once,
 * and that sentence is only true with this clause in it.
 */
const ownChildren = (children: readonly LoomNode[]): readonly LoomNode[] =>
  children.flatMap<LoomNode>((child) => {
    switch (child.kind) {
      case "element":
        return []
      case "text":
        return [child]
      case "slot":
        return [{ ...child, children: ownChildren(child.children) }]
    }
  })

/**
 * What a part says on its own, read with `copyIn` against a node stripped of
 * everything that is a part in its own right.
 *
 * `copyIn` walks a subtree, which is right for its callers and wrong here — a
 * root would carry every word on the page and so would every band on the way
 * down. Rather than reimplement its rules about blank strings, non-string values
 * and what counts as declared, this hands it the node with only the children
 * that are nobody else's, which is exactly the part's own contribution.
 */
const ownCopy = (node: ElementNode, declarations: CopyDeclarations): NodeCopy =>
  copyIn({ ...node, children: ownChildren(node.children) }, declarations)

const standingOf = (counters: ReaderTally | undefined, views: number): PartStanding => {
  if (counters !== undefined && counters.reached > 0) return "read"
  if (views === 0) return "unknown"
  if (counters === undefined) return "skipped"

  return "unknown"
}

const countedStandings = (
  parts: readonly PartReading[]
): Readonly<Record<PartStanding, number>> => {
  const counts = { ...NO_STANDINGS }

  for (const part of parts) counts[part.standing] += 1

  return counts
}

/**
 * Every row, in one pass over the parts.
 *
 * A pass per row would be a scan of the page per member of the vocabulary, and
 * the vocabulary grows while the page is what it is. One pass keeps this linear
 * in the parts, which is the standard rule 4 holds the ledger to — it was
 * quadratic once, and a 6,000-node page took 314 ms.
 */
const roleReadingsOf = (parts: readonly PartReading[]): readonly RoleReading[] => {
  const rows = new Map<PrimitiveRole | null, RoleReading>(
    [...PRIMITIVE_ROLES, null].map((role) => [
      role,
      {
        role,
        parts: 0,
        standings: { ...NO_STANDINGS },
        dwellMs: 0,
        activations: 0,
        opens: 0,
        closes: 0,
        completions: 0,
      },
    ])
  )

  for (const part of parts) {
    const row = rows.get(part.role)
    /**
     * A role this runtime does not know cannot reach here — `rolesByType` only
     * ever yields members of `PRIMITIVE_ROLES` — so a missing row would be this
     * module disagreeing with itself rather than a host doing something. Skipped
     * rather than thrown: a reading is not worth failing over, and a row that
     * does not exist cannot be drawn.
     */
    if (row === undefined) continue

    rows.set(part.role, {
      ...row,
      parts: row.parts + 1,
      standings: { ...row.standings, [part.standing]: row.standings[part.standing] + 1 },
      dwellMs: row.dwellMs + (part.counters?.dwellMs ?? 0),
      activations: row.activations + (part.counters?.activations ?? 0),
      opens: row.opens + (part.counters?.opens ?? 0),
      closes: row.closes + (part.counters?.closes ?? 0),
      completions: row.completions + (part.counters?.completions ?? 0),
    })
  }

  return [...rows.values()]
}

/**
 * Join a window's counters to the tree and registry they were filed against.
 *
 * The tree carries the pair the counters are keyed by, so there is no way to ask
 * this question about a revision without holding the revision — which is the
 * property that makes the answer trustworthy. Rows filed under anything else are
 * dropped and counted.
 */
export const pageReadingOf = (
  tree: LoomTree,
  tallies: readonly ReaderTally[],
  declarations: PartDeclarations
): PageReading => {
  const byNode = new Map<NodeId, ReaderTally>()
  const duplicated: NodeId[] = []
  let foreign = 0

  for (const tally of tallies) {
    if (tally.treeId !== tree.treeId || tally.revision !== tree.revision) {
      foreign += 1
      continue
    }

    if (byNode.has(tally.nodeId)) {
      duplicated.push(tally.nodeId)
      continue
    }

    byNode.set(tally.nodeId, tally)
  }

  const views = [...byNode.values()].reduce((most, tally) => Math.max(most, tally.views), 0)
  const roles = rolesByType(declarations)

  const parts = outlineTree(tree.root).flatMap((entry): readonly PartReading[] => {
    const { node } = entry
    /**
     * Elements only, and that is the whole universe rather than a narrowing: a
     * text or slot node carries no identity attributes, so no signal can ever
     * name one. A text node's words are read as its parent's (`ownCopy`), so
     * nothing in the tree goes unaccounted for.
     */
    if (node.kind !== "element") return []

    const counters = byNode.get(node.id)

    return [
      {
        nodeId: node.id,
        type: node.type,
        role: roles.get(node.type) ?? null,
        depth: entry.depth,
        parentId: entry.parentId,
        standing: standingOf(counters, views),
        counters,
        copy: ownCopy(node, declarations),
      },
    ]
  })

  const addressed = new Set(parts.map((part) => part.nodeId))

  return {
    treeId: tree.treeId,
    revision: tree.revision,
    views,
    parts,
    roles: roleReadingsOf(parts),
    standings: countedStandings(parts),
    foreign,
    orphaned: [...byNode.keys()].filter((nodeId) => !addressed.has(nodeId)),
    duplicated,
  }
}

/**
 * The words readers actually reached, in reading order.
 *
 * The third question step 6 names, and it is a filter rather than a build: a
 * part's words are its own, so concatenating the read ones double-counts
 * nothing. What it cannot include is a word whose part declared no `copy` —
 * those are in each part's `copy.unread`, named, because a reading that returned
 * them would be guessing and one that dropped them silently would be the failure
 * 0122 exists to prevent.
 */
export const wordsReadIn = (reading: PageReading): readonly string[] =>
  reading.parts.filter((part) => part.standing === "read").flatMap((part) => [...part.copy.words])
