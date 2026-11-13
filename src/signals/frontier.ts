import type { AudienceId } from "../audience/audience.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import type { PageReading, PartReading, PartStanding } from "./parts.js"
import { between, extentsOf, prefixOf } from "./subtrees.js"

/**
 * **Where a window's reading of a page stopped.**
 *
 * [`parts.ts`](parts.ts) says, for every part of one revision, whether any view
 * reported reaching it. That is the question *which parts of a page are read and
 * which are scrolled past* answered part by part, and part by part is not how
 * the answer is true.
 *
 * ## Forty skipped parts are usually one skipped part
 *
 * A page whose pricing band never came into anybody's viewport has a band, the
 * rows inside it, the cells inside those and every heading and price among them
 * all reporting `skipped` — because none of them was reached, which is one fact
 * about one band restated once per node underneath it.
 * {@link PageReading.standings} counts forty, and a screen drawing that number
 * says *forty parts of this page go unread* about a page with **one** place a
 * reader stopped.
 *
 * It is the plausible-false-number failure in its worst direction: the figure is
 * the right shape, it moves when the page changes, and it is forty times the
 * size of the thing to fix. A fix-list built on it would list the forty and lead
 * with whichever one happened to sort first.
 *
 * **So the reading a surface wants is the frontier**: the parts that were not
 * reached and whose containing part *was* — every place the reading of the page
 * actually stopped — with everything beneath each of them counted as what that
 * one stop costs.
 *
 * ## It is derivable, which is why it is here and not on the wire
 *
 * Nothing new is collected, stored or sent. A stop is *a part with no row whose
 * container has one*, and the container is
 * {@link PartReading.withinId} — the nearest addressed ancestor, derived from
 * the tree the counters already name
 * ([0368](../../decisions/0368-what-readers-did-inside-a-part-is-derived-from-the-tree-and-the-sum-is-exact-because-occurrences-add.md)
 * clause 4). The browser has two attributes on an element and could not answer
 * this at any payload: it does not know which of the nodes it is reporting on
 * contains which others, and
 * [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * refused to teach it for the high-volume kinds, which are exactly the kinds
 * this reads.
 *
 * ## Every part is accounted for exactly once
 *
 * Each part that went unreached belongs to exactly one stop — itself where it is
 * one, and otherwise the nearest stop above it — so the stops partition the
 * unreached parts and their `unseen` figures add to
 * {@link PageReading.standings}' `skipped` without a caller checking anything.
 * The same partition carries the words: a part's `copy` is its own and never its
 * subtree's (0122), so *the words nobody reached* is a concatenation rather than
 * a deduplication.
 *
 * **Stops can nest, and only because of a defect.** A part that reported nothing
 * while a part inside it reported reach was plainly on a reader's screen, so a
 * skipped part containing a read one is a primitive not spreading its identity
 * attributes — the failure `sdk/conformance.ts` exists to catch — and the read
 * part's own children, if they went unreached, are a second stop inside the
 * first. The partition is on the *nearest* stop for exactly this case, so the
 * arithmetic holds while the defect is reported
 * ({@link PageFrontier.notReporting}, {@link UnreachedPart.reportedBelow}) rather
 * than quietly double-counted.
 *
 * ## A page nobody opened has no frontier
 *
 * `skipped` means *the window held views of this revision and none of them said
 * anything about this part*, so a window with no views makes every part
 * `unknown` and this reading empty — which is the honest answer and the one
 * `parts.ts` was careful to make reachable. *A page every part of which was
 * skipped* is not a state counters can produce.
 *
 * ## It is not `progress.ts`' stop, and the two words had to be kept apart
 *
 * [`progress.ts`](progress.ts) measures a **fall**: of the views that reached
 * one part, how many reached the next part of the same run. That is a question
 * about how many readers got past something, it is a ratio of two `reached`
 * counts, and it needs both ends to have reported. This measures the opposite
 * end of the same page: the parts that reported **nothing at all**, where there
 * is no ratio to take and the only figure available is how much of the page one
 * absence accounts for. A fall says *a third of them stopped here*; a frontier
 * part says *this is as far as the reading goes, and nineteen parts are behind
 * it*. `ReadingStop` is already that lane's word for the first, so nothing here
 * is called a stop.
 *
 * Pure, and a function of a reading rather than of a tree: it reaches no store,
 * no clock, no registry and no DOM, adds nothing to the broadcaster's import
 * graph, and is linear in the parts of the page.
 */

/**
 * One place the reading of a page stopped: a part no view reported reaching,
 * sitting inside a part that was reached.
 */
export type UnreachedPart = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays (0114), or `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /** Depth in the tree, counting every node; 0 at the root. */
  readonly depth: number
  /**
   * The part it sits inside, and `null` at the outermost part — which is the
   * one stop that means *the page itself was never reported on*.
   *
   * Never a part that was skipped as well: a skipped part inside a skipped part
   * is the same stop stated twice, and only the outer one is here.
   */
  readonly withinId: NodeId | null
  /**
   * What that containing part's standing was.
   *
   * `read` is the ordinary stop — a reader had the container in front of them
   * and went no further into it. `unknown` is the sharper one: the container
   * reported something other than coming into view, so a reader acted on a part
   * that no `viewed` ever named. `null` goes with a `null` container.
   */
  readonly within: PartStanding | null
  /** Parts in its subtree, itself excluded, whatever each of them reported. */
  readonly beneath: number
  /**
   * Parts this stop accounts for, itself included — so 1 for a stop with
   * nothing inside it.
   *
   * The unreached parts whose nearest stop is this one. Every stop's figure adds
   * into {@link PageFrontier.unseen} and no part is in two of them, which is
   * what makes *this is the one place to fix and it costs you this much of the
   * page* a sentence rather than an estimate.
   */
  readonly unseen: number
  /**
   * Parts in its subtree that **did** report reach, which should be none.
   *
   * Above zero says a reader was below a part that said nothing about itself, so
   * this stop is not the whole truth about what went unseen and the part is
   * named in {@link PageFrontier.notReporting}.
   */
  readonly reportedBelow: number
  /**
   * The words nobody reached here, in reading order: this part's own and those
   * of every part it accounts for.
   *
   * A part's words are its own and never its subtree's (0122), so these
   * concatenate across stops without a headline being read twice.
   */
  readonly words: readonly string[]
}

/** Where one window's reading of one revision of one page stopped. */
export type PageFrontier = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The audience the reading was of, carried through from
   * {@link PageReading.audienceId} unchanged.
   *
   * Carried rather than derived, and carried for one reason: an order over a
   * deployment's pages tells two readings apart by this trio and refuses to
   * count a page twice by it (`readingKeyOf`), and a frontier that dropped the
   * audience would hand such an order two forms of one page it could not tell
   * apart. It is the field `ReadingProgress.audienceId` is, for the reading
   * beside it (0300).
   */
  readonly audienceId: AudienceId | null
  /**
   * Every audience the window named, carried through from
   * {@link PageReading.audiences} unchanged.
   *
   * Carried for the reason above, one step further on. A window holding two
   * forms with none asked for is read as neither, so every part is `unknown`,
   * {@link PageFrontier.views} is nought and this reading is empty — which is
   * the **same shape** an unopened page produces and a different sentence
   * entirely. The pair of fields is what `audienceScopeRead` needs to tell them
   * apart, and nothing else can (0290, 0300).
   */
  readonly audiences: readonly AudienceId[]
  /**
   * The floor on page views the reading was drawn from, carried through from
   * {@link PageReading.views}.
   *
   * Zero is what makes this reading empty, and the two are not the same
   * sentence: *nobody opened this page* is not *every reader stopped at the
   * top*.
   */
  readonly views: number
  /** Every place the reading stopped, in reading order. */
  readonly frontier: readonly UnreachedPart[]
  /**
   * Parts no view reported reaching — the sum of every stop's `unseen`, and so
   * equal to `skipped` in {@link PageReading.standings}.
   */
  readonly unseen: number
  /** Parts at least one view reported reaching. */
  readonly read: number
  /** Parts nothing can be said about. */
  readonly unknown: number
  /** Every addressed node of the revision, which is the universe the rest is out of. */
  readonly parts: number
  /**
   * Parts that were reached, hold at least one part, and whose every part went
   * unreached.
   *
   * A reader had it on screen and went past the whole of what it holds, which is
   * the one statement of *scrolled past* that is about a reader's behaviour
   * rather than about a part's absence from a table. A part with an `unknown`
   * anywhere inside it is absent from this list: what happened there cannot be
   * spoken for, so *every part of it* cannot be claimed.
   */
  readonly passedOver: readonly NodeId[]
  /**
   * Parts that reported nothing while a part inside them reported reach.
   *
   * A defect rather than a reading: a reader was demonstrably below it, so it was
   * on screen and did not say so. The usual cause is a primitive that does not
   * spread the identity attributes a broadcaster reads, which
   * `sdk/conformance.ts` checks; a sender switched on mid-release is the other.
   */
  readonly notReporting: readonly NodeId[]
  /**
   * Rows of the reading that named a node this revision does not contain,
   * carried through from {@link PageReading.orphaned}.
   *
   * Above zero means the tree and the window do not belong together, and this
   * reading is the one that looks most plausible when they do not: a wrong pair
   * reads as a page a reader stopped at the top of. A surface should refuse to
   * draw rather than render it, which is what `parts.ts` already says about the
   * list itself.
   */
  readonly orphaned: number
}

/**
 * Read a page's reading as the places it stopped.
 *
 * One pass to find each part's containing part and the end of its subtree, one
 * to assign each unreached part to the frontier part that accounts for it, and
 * prefix counts for the rest — so the whole reading is linear in the parts of the page.
 * The ledger's bound (rule 4 of [`docs/signals.md`](../../docs/signals.md)) is
 * the standard every reading here is held to, and walking a part's ancestors per
 * part is the shape it forbids.
 */
export const pageFrontierOf = (reading: PageReading): PageFrontier => {
  const parts = reading.parts
  const total = parts.length

  /**
   * The index of the part each part sits inside, and the exclusive end of each
   * part's subtree, both from one pre-order pass over a stack of open parts.
   *
   * Spelled in [`subtrees.ts`](subtrees.ts) rather than here, because the
   * library's reading of the same defect needs the same two projections and a
   * second spelling of them is the failure this subsystem already has a name
   * for (0393).
   */
  const { containers, ends } = extentsOf(parts)

  /**
   * The frontier part that accounts for each unreached part: itself where its
   * container was reached or cannot be spoken for, and otherwise whatever
   * accounts for its container — which pre-order guarantees has already been
   * decided, because a container always precedes what it contains.
   */
  const accountedBy: (number | null)[] = []

  for (const [at, part] of parts.entries()) {
    if (part.standing !== "skipped") {
      accountedBy.push(null)
      continue
    }

    const container = containers[at] ?? null
    const above = container === null ? undefined : parts[container]
    const nested = above !== undefined && above.standing === "skipped"

    /**
     * The fallback is a guard rather than a branch nothing takes, and the two
     * halves of this line say the same thing twice on purpose. A container that
     * cannot be spoken for has no accounting part of its own, so if `nested`
     * were ever widened to *not read* the `??` would still land this part on
     * itself — which is the right answer, and a mutation that widens it cannot
     * be made to fail. Either guard alone is correct; neither alone says why.
     */
    accountedBy.push(nested && container !== null ? (accountedBy[container] ?? at) : at)
  }

  const reads = prefixOf(parts, "read")
  const skips = prefixOf(parts, "skipped")

  /**
   * What each frontier part accounts for, gathered in reading order in one pass.
   *
   * The words are pushed into one array per frontier part rather than
   * reassembled per part. A page whose whole body is one frontier part would
   * otherwise copy a growing array once per part beneath it, which is the
   * quadratic shape rule 4 exists to keep out of these readings.
   */
  const accounted = new Map<number, number>()
  const unreadWords = new Map<number, string[]>()

  for (const [at, part] of parts.entries()) {
    const owner = accountedBy[at] ?? null
    if (owner === null) continue

    accounted.set(owner, (accounted.get(owner) ?? 0) + 1)

    const into = unreadWords.get(owner) ?? []
    for (const word of part.copy.words) into.push(word)
    unreadWords.set(owner, into)
  }

  const frontier: UnreachedPart[] = []
  const passedOver: NodeId[] = []
  const notReporting: NodeId[] = []

  for (const [at, part] of parts.entries()) {
    const end = ends[at] ?? total
    const beneath = end - at - 1
    const readBelow = between(reads, at + 1, end)

    if (part.standing === "skipped" && readBelow > 0) notReporting.push(part.nodeId)

    if (part.standing === "read" && beneath > 0 && between(skips, at + 1, end) === beneath) {
      passedOver.push(part.nodeId)
    }

    if ((accountedBy[at] ?? null) !== at) continue

    const container = containers[at] ?? null
    const above = container === null ? undefined : parts[container]

    frontier.push({
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      depth: part.depth,
      withinId: part.withinId,
      within: above?.standing ?? null,
      beneath,
      unseen: accounted.get(at) ?? 1,
      reportedBelow: readBelow,
      words: unreadWords.get(at) ?? [],
    })
  }

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    audienceId: reading.audienceId,
    audiences: reading.audiences,
    views: reading.views,
    frontier,
    unseen: reading.standings.skipped,
    read: reading.standings.read,
    unknown: reading.standings.unknown,
    parts: total,
    passedOver,
    notReporting,
    orphaned: reading.orphaned.length,
  }
}

/**
 * The frontier parts that cost the page the most, largest first.
 *
 * By {@link UnreachedPart.unseen} — the parts one of them accounts for — which
 * is the figure a fix-list is ordered by: *the pricing band costs you nineteen
 * parts of this page, the footnote costs you one*. Ordering by `beneath`
 * instead would rank a part by how much is inside it whether or not this reading
 * lost any of it, and ordering by depth would put the top of the page first on
 * every page there is.
 *
 * Ties keep reading order, so two of one size are drawn in the order the page is
 * written rather than in the order a sort happened to leave them.
 */
export const largestUnreachedIn = (
  frontier: PageFrontier,
  limit?: number
): readonly UnreachedPart[] => {
  const ordered = [...frontier.frontier].sort((left, right) => right.unseen - left.unseen)

  return limit === undefined ? ordered : ordered.slice(0, limit)
}

/**
 * The words nobody reached, in reading order.
 *
 * The complement of `wordsReadIn` and exact for the same reason: a part's words
 * are its own, every unreached part belongs to exactly one frontier part, and so
 * this concatenates rather than deduplicates. What it cannot include is a word whose
 * part declared no `copy` — those are in each part's `copy.unread`, named,
 * because a reading that guessed at them and one that dropped them silently are
 * the two failures 0122 exists to prevent.
 */
export const unreachedWordsIn = (frontier: PageFrontier): readonly string[] =>
  frontier.frontier.flatMap((part) => [...part.words])
