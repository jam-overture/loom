import type { ElementNode, LoomNode, LoomTree, NodeId, PrimitiveType } from "@jam-overture/loom"
import {
  deploymentUnreadOf,
  describeUnreadStanding,
  largestUnreachedIn,
  pageFrontierOf,
  pageReadingOf,
  unreachedWordsIn,
  worstPlacesIn,
  type PageFrontier,
  type ReaderTally,
} from "@jam-overture/loom/signals"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"
import { docsRegistry } from "@/app/(docs)/_lib/loom/registry"

/**
 * What *A count of parts is not a count of things to fix* prints, worked out
 * rather than typed.
 *
 * **The plain version.** The page above this block has already said what a
 * reader's browser sends: a node and a kind, and nothing else. This block is
 * about the questions a server can answer anyway, because it is holding the
 * **tree** those nodes came out of. Nothing new is collected for any of them.
 *
 * Two readings are produced here, and both of them exist to correct the same
 * plausible-looking number.
 *
 * - `pageFrontierOf` reads one page as **the places its reading stopped** — a
 *   part nobody reached whose container was reached — with everything beneath
 *   each one counted as what that single fix recovers
 *   ([0374](../../../../../../decisions/0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)).
 * - `deploymentUnreadOf` puts those readings in an order over a deployment's
 *   pages, ranked on what one fix recovers rather than on how many parts went
 *   unread
 *   ([0377](../../../../../../decisions/0377-a-deployments-unread-places-are-a-fourth-order-ranked-on-what-one-fix-recovers.md)).
 *
 * ## The window is constructed, and the page says so
 *
 * These two trees are examples on a documentation site. **No reader has ever
 * read either of them**, so there are no counters to fold and there is no
 * honest way to pretend otherwise — the alternative is a table of plausible
 * figures, which is the one thing this surface keeps refusing to ship.
 *
 * So the *window* is made up on purpose, in the open, from one stated number of
 * page views and a rule about which parts were reached. **What is not made up
 * is any figure the page states.** Every number printed is the runtime's own
 * arithmetic over this site's own registry and this site's own example trees,
 * so a change to either moves the figures on the page, and a change to the
 * arithmetic takes the page red.
 *
 * That is the same bargain the three produced blocks above this one make, and
 * it is the honest half of the one below it: the live block has a real reader —
 * whoever is looking at the page — and no server, and these have a real
 * arithmetic and no reader.
 */

/** One stated number of page views, so that no part's standing is `unknown`. */
const VIEWS = 12

/** How many places the deployment order prints, which is both of them today. */
const PLACES_SHOWN = 4

/**
 * A part, for the two window rules below.
 *
 * A part is an **element**: a slot is a node with children and is never a part,
 * and neither is a run of text, which is why this walk collects one kind of
 * node and counts the rest only as a way through
 * ([0368](../../../../../../decisions/0368-what-readers-did-inside-a-part-is-derived-from-the-tree-and-the-sum-is-exact-because-occurrences-add.md)
 * clause 4).
 */
type Part = {
  readonly node: ElementNode
  /** Elements below it, at any depth. Zero makes it a leaf of the page's shape. */
  readonly beneath: number
}

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

const childrenOf = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "element" || node.kind === "slot" ? node.children : []

/**
 * Every part of a tree, in reading order, carrying how many parts are below it.
 *
 * An explicit stack rather than a recursion, for the reason 0372 gives about
 * every walk in this repository: a page's depth is data, and these two trees
 * being shallow is a fact about today's examples.
 */
const partsOf = (tree: LoomTree): readonly Part[] => {
  const found: ElementNode[] = []
  const stack: LoomNode[] = [tree.root]

  while (stack.length > 0) {
    const node = stack.pop()

    if (node === undefined) continue
    if (isElement(node)) found.push(node)

    stack.push(...[...childrenOf(node)].reverse())
  }

  return found.map((node) => ({
    node,
    beneath: [...descendantsOf(node)].filter(isElement).length,
  }))
}

/** Every node below one, at any depth, slots and text included. */
const descendantsOf = (node: LoomNode): readonly LoomNode[] => {
  const found: LoomNode[] = []
  const stack: LoomNode[] = [...childrenOf(node)]

  while (stack.length > 0) {
    const next = stack.pop()

    if (next === undefined) continue

    found.push(next)
    stack.push(...childrenOf(next))
  }

  return found
}

const tallyFor = (tree: LoomTree, nodeId: NodeId, type: PrimitiveType): ReaderTally => ({
  treeId: tree.treeId,
  revision: tree.revision,
  nodeId,
  type,
  views: VIEWS,
  reached: VIEWS,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

/**
 * A window in which every reader read the opening band and left.
 *
 * The root and the first band under it reported reach; nothing else did. It is
 * the ordinary shape of a page people do not scroll, and it is the shape that
 * makes the count of parts most misleading — everything below the fold is one
 * fact about one band, restated once per node underneath it.
 */
const stoppedAtTheTop = (tree: LoomTree): readonly ReaderTally[] => {
  const opening = childrenOf(tree.root).find(isElement)
  const inside = new Set<NodeId>(
    opening === undefined ? [] : [opening.id, ...descendantsOf(opening).filter(isElement).map((node) => node.id)]
  )

  return partsOf(tree)
    .filter((part) => part.node.id === tree.root.id || inside.has(part.node.id))
    .map((part) => tallyFor(tree, part.node.id, part.node.type))
}

/**
 * A window in which readers reached every band and none of the leaves in them.
 *
 * The mirror image of the one above: many places the reading stopped, each
 * costing one part. It is the window that ranks first on the count of unread
 * parts and last on what going and looking at it is worth, which is the whole
 * reason the order is not drawn on that count.
 */
const missedTheLeaves = (tree: LoomTree): readonly ReaderTally[] =>
  partsOf(tree)
    .filter((part) => part.beneath > 0)
    .map((part) => tallyFor(tree, part.node.id, part.node.type))

const exampleAt = (id: string) => {
  const example = docsExamples.get(id)

  if (example === undefined) {
    throw new Error(`loom: the reading-stopped block needs the "${id}" example`)
  }

  return example
}

const exampleTree = (id: string): LoomTree => exampleAt(id).build()

/** What the example calls itself, so a caption names the tree rather than its id. */
const titleOf = (id: string): string => exampleAt(id).title

const frontierOf = (tree: LoomTree, tallies: readonly ReaderTally[]): PageFrontier =>
  pageFrontierOf(pageReadingOf(tree, tallies, docsRegistry))

/** The two pages the block is about, named as a reader of the page would name them. */
export const READING_STOPPED_EXAMPLE = "a-page-a-reader-scrolls"
export const LEAVES_MISSED_EXAMPLE = "a-band-dropped-in-whole"

export type StopRow = {
  readonly type: PrimitiveType
  /** What this one place accounts for: itself and every unreached part behind it. */
  readonly unseen: number
  /** Parts below it, whatever each of them reported. */
  readonly beneath: number
}

export type PageStopped = {
  /** The example this reading is of, so the caption can name the tree on the page. */
  readonly example: string
  readonly title: string
  readonly parts: number
  /** Parts no view reported reaching — the number a screen would print as *unread parts*. */
  readonly unseen: number
  /** Places the reading stopped — the number of things to fix. */
  readonly places: number
  readonly stops: readonly StopRow[]
  /** The words nobody reached, in reading order. */
  readonly words: readonly string[]
}

const readingOf = (example: string, frontier: PageFrontier): PageStopped => ({
  example,
  title: titleOf(example),
  parts: frontier.parts,
  unseen: frontier.unseen,
  places: frontier.frontier.length,
  stops: largestUnreachedIn(frontier, PLACES_SHOWN).map((part) => ({
    type: part.type,
    unseen: part.unseen,
    beneath: part.beneath,
  })),
  words: unreachedWordsIn(frontier),
})

/**
 * Where the reading of this page's own example tree stopped.
 *
 * The tree is the one at the top of the page, which is the point: a reader has
 * already scrolled it, and the figures below are about the thing they scrolled
 * rather than about a fixture written to make the argument come out.
 */
export const produceStopped = (): PageStopped =>
  readingOf(
    READING_STOPPED_EXAMPLE,
    frontierOf(exampleTree(READING_STOPPED_EXAMPLE), stoppedAtTheTop(exampleTree(READING_STOPPED_EXAMPLE)))
  )

export type OrderRow = {
  readonly example: string
  readonly title: string
  /** Parts nobody reached: the key that gets the order backwards. */
  readonly unseen: number
  readonly places: number
  /** What one fix recovers, which is the key the order is on. `null` off the order. */
  readonly costs: number | null
  readonly standing: string
  /**
   * Why the page is where it is, in the runtime's own words.
   *
   * Carried because the two sentences that matter are the ones that look alike:
   * a page nobody opened and a page every part of which was read produce the
   * same empty reading, and only this tells them apart.
   */
  readonly standingSays: string
}

export type DeploymentOrdered = {
  /** By what one fix recovers, worst first — the published order. */
  readonly byCost: readonly OrderRow[]
  /** The same two pages by parts nobody reached, which is the other answer. */
  readonly byParts: readonly OrderRow[]
  /** Places across the deployment, worst first. */
  readonly places: readonly {
    readonly example: string
    readonly title: string
    readonly unseen: number
    /** This place's share of every unread part in the deployment. */
    readonly share: number
  }[]
  readonly unseen: number
  readonly stops: number
}

/**
 * Two pages of one deployment, ordered twice: by what one fix recovers, and by
 * the count of unread parts.
 *
 * The two orders disagree, which is the claim. One page has a single band
 * nobody scrolled to; the other has readers who reached every band and none of
 * the leaves inside them — so the second has more unread parts and the first is
 * the page to go and look at.
 */
export const produceOrdered = (): DeploymentOrdered => {
  const stopped = exampleTree(READING_STOPPED_EXAMPLE)
  const leaves = exampleTree(LEAVES_MISSED_EXAMPLE)

  const named = new Map<string, string>([
    [stopped.treeId, READING_STOPPED_EXAMPLE],
    [leaves.treeId, LEAVES_MISSED_EXAMPLE],
  ])

  const readings = [
    frontierOf(stopped, stoppedAtTheTop(stopped)),
    frontierOf(leaves, missedTheLeaves(leaves)),
  ]

  const unread = deploymentUnreadOf(readings)
  const nameOf = (treeId: string): string => named.get(treeId) ?? treeId

  const rowFor = (page: (typeof unread.ranked)[number]): OrderRow => ({
    example: nameOf(page.treeId),
    title: titleOf(nameOf(page.treeId)),
    unseen: page.reading.unseen,
    places: page.reading.frontier.length,
    costs: page.costs,
    standing: page.standing,
    standingSays: describeUnreadStanding(page.standing),
  })

  const rows = [...unread.ranked, ...unread.unranked].map(rowFor)

  return {
    byCost: rows,
    byParts: [...rows].sort((left, right) => right.unseen - left.unseen),
    places: worstPlacesIn(unread, PLACES_SHOWN).map((place) => ({
      example: nameOf(place.treeId),
      title: titleOf(nameOf(place.treeId)),
      unseen: place.at.unseen,
      share: place.share,
    })),
    unseen: unread.unseen,
    stops: unread.places,
  }
}
