import type { AudienceId } from "../audience/audience.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"
import type { NodeCopy } from "../sdk/copy.js"
import type { ElementNode } from "../tree/node.js"
import { outlineTree } from "../tree/outline.js"
import type { LoomTree } from "../tree/tree.js"

import {
  actedCountOf,
  type ActedCounts,
  type ActedKind,
  type StoredActed,
  type StoredActedHour,
} from "./acted.js"
import type { ArrivalRange } from "./arrivals.js"
import { audiencesIn } from "./audiences.js"
import { ownCopy, rolesByType } from "./join.js"
import type { PartDeclarations } from "./parts.js"

/**
 * **What readers did inside each part of a page, over a range.**
 *
 * [`parts.ts`](parts.ts) joins a window's tallies to the tree they were filed
 * against, which answers *which parts of this page are read and which are
 * scrolled past* — for a window, since counting began, with no clock in it.
 * [`acted.ts`](acted.ts) put a clock on the three kinds a reader aimed at
 * something to cause (0362), which answers *what readers did to this part, by
 * the hour* — for one part, or for a page with the part dimension collapsed.
 *
 * Neither answers the question a page's own shape asks: **a reader pressed
 * something; what was it inside?**
 *
 * ## The payload already refused to answer this, and was right to
 * [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * put `within` on the three delegated kinds — the addressed ancestors a press
 * happened inside — and refused it on `viewed` and `dwelled`, where the payload
 * would have been multiplied by the depth of the page to buy what a server can
 * derive. The fold spends that `within` on one counter: `engaged`, a *distinct
 * count of page views* on each ancestor (`rollup.ts`). Distinct counts do not
 * add and the tally keeps no time, so `engaged` cannot answer *how many presses
 * landed in the pricing band last Tuesday* — and the hourly counter cannot
 * either, because it writes a row for the node a signal **named** and for no
 * ancestor of it.
 *
 * **So the ancestry is derived here, from the tree, and not read off the wire at
 * all.** Every row names a tree, a revision and a node; the tree the counters
 * name says what that node sits inside; a sum over a subtree is the answer. No
 * byte is added to any payload, no browser changes, nothing new is stored, and
 * the reading works on batches whose `within` was missing altogether — which is
 * every batch synthesised on a server or replayed from a fixture (`rollup.ts`
 * names that case).
 *
 * ## Why the sum is exact, which is the whole reason this is publishable
 *
 * Every signal of these three kinds wrote **one** hourly row, on **one** node:
 * the one it named. So a subtree's total counts each action exactly once, at
 * whatever depth it happened, and a part's own count plus the totals of the
 * parts immediately inside it is its own total — an invariant, asserted rather
 * than hoped for. Adding occurrences is safe where adding `views`, `reached` or
 * `engaged` is not (0147, 0284), and `ActedCounts` is separated from its key in
 * `acted.ts` to say so in the types.
 *
 * It is the one counter in this subsystem that a nesting sum may be taken over.
 * A reading that added `engaged` up a tree would count one reader's one press
 * once per ancestor and the row would look right, which is why the shape here
 * is four occurrence counters and nothing else.
 *
 * ## One revision, because the counts are laid on a tree
 *
 * `readReaderActed` reads every revision by default and adds them, which is
 * what a goal wants (0350): a goal is a kind on a part and a part outlives a
 * change to the page around it. This reading cannot do that. It lays counts on
 * **a** tree, and a node's ancestry is a fact about one revision — the band a
 * button sat in last week may not be the band it sits in now, and summing both
 * revisions into one shape would attribute the earlier presses to the later
 * page. Rows of another revision are dropped and counted, as `parts.ts` drops
 * them, so a caller who passed the wrong pair can tell.
 *
 * Audiences, by contrast, **add**. Two forms of a page are two sets of rows over
 * one tree at one revision (0263, 0284), and a press in one form plus a press in
 * the other is two presses — a true count, because these are occurrences and not
 * readers. `parts.ts` refuses a window of two audiences because its figures
 * divide by distinct page views; nothing here divides by anything, so the rows
 * are summed and the audiences they came from are published beside the answer
 * (0297).
 *
 * ## Read time, not rollup time
 *
 * For `parts.ts`' reason, and one more. A declaration is a fact about the
 * library rather than about a window of reading, so baking the join into stored
 * rows makes today's silence permanent. Here the baking would be worse than
 * permanent: it would be a second write per ancestor per hour, which is the
 * payload explosion 0167 refused, moved from the wire into the database.
 *
 * Pure. Handed a tree, one read of the counter and the declarations; reaches no
 * store, no clock and no DOM, and adds nothing to the broadcaster's import
 * graph.
 */

const NO_COUNTS: ActedCounts = Object.freeze({
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

/** The four counters, while a pass is still adding to them. */
type Counting = {
  activations: number
  opens: number
  closes: number
  completions: number
}

const counting = (): Counting => ({ activations: 0, opens: 0, closes: 0, completions: 0 })

const addInto = (into: Counting, counts: ActedCounts): void => {
  into.activations += counts.activations
  into.opens += counts.opens
  into.closes += counts.closes
  into.completions += counts.completions
}

const frozen = (counts: Counting): ActedCounts => ({
  activations: counts.activations,
  opens: counts.opens,
  closes: counts.closes,
  completions: counts.completions,
})

/**
 * One part of the page, what readers did to it, and what they did inside it.
 *
 * The three facts about where it sits are here rather than left to a caller
 * because they are what the answer means: *forty presses inside this* is a
 * sentence about a region of a page, and a list that did not say which regions
 * contain which others would be forty presses counted as many times as a
 * caller added rows together.
 */
export type InsidePart = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** Depth in the tree, counting every node; 0 at the root. */
  readonly depth: number
  /**
   * The nearest **addressed** ancestor, which is what `within` names (0167),
   * and `null` at the outermost part.
   *
   * Not the tree parent. A slot is a node with children and is never a part —
   * no signal can name one, because only an element carries the identity
   * attributes a broadcaster reads — so the part immediately containing an
   * element is the nearest *element* above it, with any slots between them
   * passed through. A reading keyed on the tree parent would hang a band off a
   * node that appears nowhere in its own list.
   */
  readonly withinId: NodeId | null
  /** What readers did to this part itself, in the range. */
  readonly own: ActedCounts
  /**
   * What readers did to this part and to every part inside it, in the range.
   *
   * Each action is in exactly one part's `own` and in the `inside` of each of
   * that part's ancestors, so this adds **down** a tree and never across one:
   * two siblings' `inside` may be added, a part's and its child's may not.
   */
  readonly inside: ActedCounts
  /** Addressed nodes in its subtree, itself included — so 1 for a part with no parts in it. */
  readonly parts: number
  /**
   * The words this part says itself: its declared copy props, and the text
   * handed to it directly or through a slot.
   *
   * Its own, never its subtree's, exactly as `PartReading.copy` is and by the
   * same function — so *a reader pressed `Get started`* is a sentence a surface
   * can write, and a caller adding two parts' words together reads no headline
   * twice.
   */
  readonly copy: NodeCopy
}

/**
 * What a range of the hourly counter says about the shape of one revision of
 * one page.
 */
export type InsideReading = {
  readonly treeId: TreeId
  readonly revision: number
  readonly range: ArrivalRange
  /** Every addressed node, in reading order, so a row is always preceded by the row it is inside. */
  readonly parts: readonly InsidePart[]
  /**
   * Everything readers did on this page in the range.
   *
   * The sum of every part's `own`. A tree's root is always an element
   * (`tree.ts`), so this is also the root's own `inside` — and it is computed
   * the other way deliberately: the two routes to one number share no
   * arithmetic, so a test that holds them equal is a check on the accumulation
   * that the accumulation cannot pass by being consistently wrong.
   */
  readonly total: ActedCounts
  /**
   * Every audience whose rows were summed into this reading.
   *
   * A census rather than a refusal (0297): the figures here are occurrences, so
   * two forms of a page add honestly, and what a caller needs is to know that
   * two were added. More than one member means this answer is about a page
   * served in two forms; narrow the read if that is not what was wanted.
   */
  readonly audiences: readonly AudienceId[]
  /** Rows summed into the reading. */
  readonly counted: number
  /**
   * Rows filed under another tree or another revision, and ignored.
   *
   * `parts.ts`' reason, sharpened by the ancestry: a node's place in the page
   * is a fact about one revision, so a row from another one would be credited
   * to whatever happens to contain that node now.
   */
  readonly foreign: number
  /**
   * Rows of this tree and revision whose hour falls outside the range, and
   * ignored.
   *
   * Ignored rather than refused, because a wider read is the ordinary way a
   * caller gets a range and the period before it from one call
   * (`actedSeriesOf`). Counted separately from `foreign` so *you passed last
   * month's rows* and *you passed another page's* are two different sentences.
   */
  readonly outside: number
  /**
   * Nodes named by a row this revision does not contain.
   *
   * The alarm `parts.ts` carries, and it matters more here: an orphaned row is
   * an action that happened on the page and is in **no** part's `inside`, so
   * the totals under-report by exactly what this names. A non-empty list says
   * the tree and the rows do not belong together.
   */
  readonly orphaned: readonly NodeId[]
  /**
   * The first hour this scope ever counted an action in, carried through from
   * the store.
   *
   * Absent means nothing has ever been counted here, which is a different
   * sentence from *nobody did anything inside anything in the range you asked
   * about* (0309, 0347).
   */
  readonly begins?: number
}

/**
 * Join a range of the hourly counter to the tree and registry it was filed
 * against, and read it as the page's own shape.
 *
 * **One read in, one reading out, and that is a guard rather than an
 * ergonomic.** `parts.ts` can refuse a tally handed in twice because a tally is
 * one row per part; an hour's counter legitimately has many rows per part, so a
 * duplicate here is invisible and would inflate every ancestor of it. Taking a
 * single {@link StoredActed} is what makes *a caller passed the same rows
 * twice* unspellable instead of undetectable (0158).
 *
 * Linear in the parts and in the rows: the rows are bucketed once, the parts are
 * walked once to find each one's nearest addressed ancestor, and the subtree
 * totals are accumulated in one pass back up the same list. The reading the
 * ledger's bound exists for (rule 4) is not allowed to walk a part's ancestors
 * per part.
 */
export const insideReadingOf = (
  tree: LoomTree,
  stored: StoredActed,
  declarations: PartDeclarations,
  range: ArrivalRange
): InsideReading => {
  const own = new Map<NodeId, Counting>()
  const here: StoredActedHour[] = []
  let foreign = 0
  let outside = 0

  for (const row of stored.hours) {
    if (row.treeId !== tree.treeId || row.revision !== tree.revision) {
      foreign += 1
      continue
    }

    if (row.hour < range.from || row.hour >= range.to) {
      outside += 1
      continue
    }

    here.push(row)

    const into = own.get(row.nodeId) ?? counting()
    addInto(into, row)
    own.set(row.nodeId, into)
  }

  const roles = rolesByType(declarations)

  /**
   * The nearest addressed ancestor of each part, found by carrying the stack of
   * open elements down the pre-order walk. A part's own ancestors are therefore
   * never re-walked: the entry whose depth is not below the top of the stack has
   * closed it, which is the only comparison this needs.
   */
  const open: { readonly nodeId: NodeId; readonly depth: number }[] = []
  const addressed: {
    readonly node: ElementNode
    readonly depth: number
    readonly withinId: NodeId | null
  }[] = []

  for (const entry of outlineTree(tree.root)) {
    while (open.length > 0 && (open.at(-1)?.depth ?? 0) >= entry.depth) open.pop()

    if (entry.node.kind !== "element") continue

    addressed.push({
      node: entry.node,
      depth: entry.depth,
      withinId: open.at(-1)?.nodeId ?? null,
    })
    open.push({ nodeId: entry.node.id, depth: entry.depth })
  }

  const inside = new Map<NodeId, Counting>(
    addressed.map(({ node }) => [node.id, counting()] as const)
  )
  const held = new Map<NodeId, number>(addressed.map(({ node }) => [node.id, 1] as const))

  /**
   * Reverse pre-order, so every part inside a part has already been totalled
   * when the part itself is reached. One pass, whatever the shape of the page.
   */
  for (const { node, withinId } of [...addressed].reverse()) {
    const subtotal = inside.get(node.id)
    if (subtotal === undefined) continue

    addInto(subtotal, own.get(node.id) ?? NO_COUNTS)

    if (withinId === null) continue

    const above = inside.get(withinId)
    if (above !== undefined) addInto(above, subtotal)

    const count = held.get(withinId)
    if (count !== undefined) held.set(withinId, count + (held.get(node.id) ?? 1))
  }

  const parts = addressed.map(({ node, depth, withinId }): InsidePart => {
    const subtotal = inside.get(node.id)

    return {
      nodeId: node.id,
      type: node.type,
      role: roles.get(node.type) ?? null,
      depth,
      withinId,
      own: frozen(own.get(node.id) ?? counting()),
      inside: subtotal === undefined ? NO_COUNTS : frozen(subtotal),
      parts: held.get(node.id) ?? 1,
      copy: ownCopy(node, declarations),
    }
  })

  const total = counting()
  for (const part of parts) addInto(total, part.own)

  const names = new Set(parts.map((part) => part.nodeId))

  return {
    treeId: tree.treeId,
    revision: tree.revision,
    range,
    parts,
    total: frozen(total),
    audiences: audiencesIn(here),
    counted: here.length,
    foreign,
    outside,
    orphaned: [...own.keys()].filter((nodeId) => !names.has(nodeId)),
    ...(stored.begins === undefined ? {} : { begins: stored.begins }),
  }
}

/**
 * The parts readers acted on most in the range, most first.
 *
 * **By what readers did to the part itself**, never by what they did inside it:
 * ordering by `inside` ranks every page by its outermost part, because an
 * ancestor's total is never below its descendant's. The question this answers is
 * *what did readers press*, and the answer to that is a button.
 *
 * One kind, for `actedSeriesOf`' reason — a list with presses and sends added
 * together is a list of two different things — and parts nobody did anything to
 * are absent rather than listed as noughts: the universe of parts that *could*
 * have been pressed is not something a tree can say today, so a list padded with
 * every heading on the page would read as a claim this reading cannot make.
 * {@link InsideReading.parts} holds the whole page for a caller that wants it.
 *
 * Ties keep reading order, so a page with ten parts at one press each is drawn
 * in the order it is written rather than in the order a sort happened to leave
 * them.
 */
export const actedMostIn = (
  reading: InsideReading,
  kind: ActedKind,
  limit?: number
): readonly InsidePart[] => {
  const ordered = reading.parts
    .filter((part) => actedCountOf(part.own, kind) > 0)
    .sort((left, right) => actedCountOf(right.own, kind) - actedCountOf(left.own, kind))

  return limit === undefined ? ordered : ordered.slice(0, limit)
}

/**
 * The share of everything readers did on the page, in one kind, that happened
 * inside one part — between 0 and 1.
 *
 * *Sixty-two per cent of the presses on this page were in the pricing band* is
 * the sentence, and it is exact rather than estimated: the numerator and the
 * denominator are counts of the same occurrences over the same rows, and each
 * occurrence is in both or in neither.
 *
 * `null` where readers did nothing of that kind on the page at all. A nought
 * there would read as *this part gets none of them*, which is a claim about the
 * part, and what is true is that there are none to share out.
 */
export const insideShareIn = (
  reading: InsideReading,
  part: InsidePart,
  kind: ActedKind
): number | null => {
  const whole = actedCountOf(reading.total, kind)

  return whole === 0 ? null : actedCountOf(part.inside, kind) / whole
}

/**
 * What readers did inside a part but not to the part itself.
 *
 * The figure that says whether a band is a thing readers use or a thing that
 * holds things readers use — and the one a surface would otherwise get by
 * subtracting two numbers it was handed, which is the subtraction that is wrong
 * if either of them is the other kind's.
 */
export const beneathOf = (part: InsidePart, kind: ActedKind): number =>
  actedCountOf(part.inside, kind) - actedCountOf(part.own, kind)
