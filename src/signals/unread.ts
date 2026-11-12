import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { audienceScopeRead, readingKeyOf } from "./audiences.js"
import {
  largestUnreachedIn,
  type PageFrontier,
  type UnreachedPart,
} from "./frontier.js"

/**
 * **The places a deployment's readers stopped, by what one fix recovers.**
 *
 * [`frontier.ts`](frontier.ts) reads one page as the places its reading stopped
 * ([0374](../../decisions/0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)):
 * a part no view reported reaching whose containing part was reached, with every
 * unreached part behind exactly one of them. This is that reading at the
 * deployment's scale — **an order over the pages, and an order over the places
 * across all of them** — so *where in this deployment should somebody go and
 * look* is a question about a list rather than about nine screens opened one at
 * a time.
 *
 * ## The count it exists instead of
 *
 * `PageReading.standings`' `skipped` counts a band, the rows inside it, the
 * cells inside those and every heading among them: one band nobody reached,
 * counted once per node underneath it. **Two pages with one unread band each are
 * ordered by how deeply each band happens to nest**, which is a fact about the
 * markup and not about the readers — and the figure looks right the whole way,
 * which is what makes it the worst kind of wrong on a fix-list.
 *
 * So nothing here is ranked on it. The key is {@link PageUnread.costs}: the
 * parts of the page that **one** place accounts for, which is what one fix
 * recovers. A page whose pricing band went unseen is one row costing nineteen
 * parts, and a page with nineteen unread footnotes at the top level is nineteen
 * rows costing one each — and the first is the page to go and look at, which is
 * the order the count of parts gets backwards.
 *
 * Both figures are published, side by side and never added: *this deployment has
 * four hundred and twelve unread parts in nine places* is the sentence, and the
 * second number is the one an operator's afternoon is spent on.
 *
 * ## Ranked by the sharpest place and not by the page's total
 *
 * A page's whole unread count is on its reading already
 * ({@link PageFrontier.unseen}) and is deliberately not the key. The precedent
 * is the order of falls, which ranks a page by its **steepest** fall and not by
 * everything it loses
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)):
 * a fix-list is a list of things somebody will do one of, so the figure it is
 * ordered by has to be what doing one of them is worth. Ranking on the total
 * would put a page with ten small scattered places above a page with one large
 * one, and send an operator to the page where their afternoon buys least.
 *
 * ## It publishes no reader count, and that is the rule rather than an omission
 *
 * Every figure here is a count of **parts of pages** or of **pages**, and not one
 * of readers. The orders beside this one are in readers — readers lost at a fall
 * (0250), readers lost between two ends of a question (0333), the readers a
 * fault costs (0271) — and a part is none of those things. So nothing here is
 * ranked against them, summed with them, or carried into them: the refusal
 * [0327](../../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
 * makes about adding figures in different units, applied to a fourth unit.
 *
 * **The fix-list's own `first` is unchanged for the same reason.** This order
 * stands beside `DeploymentAgenda.page` the way `DeploymentAgenda.converting`
 * stands beside it, and which of them a screen opens with is the screen's
 * judgement — not a comparison this file is in a position to make.
 *
 * ## The two states that must not read as *every part of this page was read*
 *
 * The reading of a page nobody opened is **empty**, and so is the reading of a
 * page every part of which was reached. Those are opposite sentences with one
 * shape, and a page read as neither of its two forms (0290, 0300) produces the
 * same empty reading a third way. So a page is never in this order on the
 * strength of an absence: {@link UnreadStanding} asks what the emptiness was,
 * and `whole` is the only member that means what it looks like.
 *
 * The sharpest of the four is a reading whose rows name nodes the revision does
 * not contain. That pair reads as *a page every reader stopped at the very top
 * of*, which is the most plausible-looking output this reading has, so it is
 * `mismatched`, it is out of the order, and its figures are withheld rather than
 * drawn (0212's alarm, carried through {@link PageFrontier.orphaned}).
 *
 * ## A part that said nothing with a reader below it is a different sentence
 *
 * {@link DeploymentUnread.notReporting} is a **slice** of the rows and not a
 * list beside them, so nothing here is counted twice (0158). It is separate
 * because the instruction is: a part a reader was demonstrably below and which
 * said nothing about itself is a primitive that does not spread the identity
 * attributes a broadcaster reads — `sdk/conformance.ts`' failure — and so it is
 * a fix in the library rather than a page to rewrite. No fault vocabulary gains
 * a member for it here: a fault nobody has seen in the wild is a name invented
 * ahead of its reader.
 *
 * Pure, linear in the readings handed in, and reaches no store, clock, registry
 * or DOM. Nothing is added to any payload, any table or any browser: a place the
 * reading stopped is derived from the tree the counters already name, which is
 * what [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * refused to put on the wire for exactly these kinds.
 */

/** Where one page stands in the order of places, or why it is not in it. */
export type UnreadStanding =
  /** In the order, with at least one place the reading stopped and a sound pair behind it. */
  | "ranked"
  /**
   * Every part of the page was reached by somebody.
   *
   * The cheerful answer, and the only member that means what an empty reading
   * looks like. A thin window reaches it honestly as well — a revision four
   * readers saw the whole of has nothing unread — and `views` on the reading is
   * what tells the two apart.
   */
  | "whole"
  /**
   * Nothing reported a view of this revision in the window, so nothing can be
   * said about any part of it.
   *
   * Not `whole`. *Nobody opened this page* and *every part of this page was
   * read* are opposite facts with one shape, and guessing the second is the
   * comforting half of a pair this subsystem has been bitten by before.
   */
  | "unread"
  /**
   * One window holds two forms of the page and the asking named neither, so it
   * is read as neither.
   *
   * Every part is `unknown` and the reading is empty while the counters behind
   * it are full (0290, 0300). The remedy is `byAudience` and two reads, and the
   * census on the reading says which two.
   */
  | "unsplit"
  /**
   * The reading names nodes this revision does not contain, so the tree and the
   * window do not belong together.
   *
   * Out of the order and its figures withheld. This is the reading that looks
   * most plausible when the pair is wrong — revision 7's counters against
   * revision 6's tree leaves most parts reporting nothing, which reads as a page
   * every reader stopped at the top of — so a surface should name it rather than
   * draw it (0212).
   */
  | "mismatched"

export const UNREAD_STANDINGS: readonly UnreadStanding[] = everyMemberOf<UnreadStanding>()([
  "ranked",
  "whole",
  "unread",
  "unsplit",
  "mismatched",
])

/** One line per standing, for a surface naming why a page is where it is. */
export const describeUnreadStanding = (standing: UnreadStanding): string => {
  switch (standing) {
    case "ranked":
      return "in the order, by the parts of the page its largest unread place accounts for"
    case "whole":
      return "every part of this page was reached by somebody"
    case "unread":
      return "nothing reported a view of this version in the window"
    case "unsplit":
      return "one window holds two forms of the page and says which readers neither"
    case "mismatched":
      return "its counters name nodes this version does not contain, so nothing here is evidence"
  }
}

/** One revision of one page, as the order of places has it. */
export type PageUnread = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The audience this row is about, or `null` where the reading named none.
   *
   * Two forms of one page stand here as two rows, for the reason they do in
   * every order in this subsystem: both are live, both have readers, and the
   * parts one form's readers never reached are not the parts the other's never
   * reached (0300).
   */
  readonly audienceId: AudienceId | null
  readonly standing: UnreadStanding
  /** The page's frontier reading, carried whole and unchanged. */
  readonly reading: PageFrontier
  /**
   * The place one fix recovers the most of this page at, or `null` where the
   * order did not rank it.
   *
   * The head of {@link largestUnreachedIn} for this page, taken from that call
   * rather than chosen again here — one rule for *which place is worst*, in the
   * module that publishes the places.
   */
  readonly at: UnreachedPart | null
  /**
   * Parts of the page that one place accounts for, which is the key the order is
   * on.
   *
   * **Withheld on a page the order did not rank, and that is a claim rather than
   * a default.** A `mismatched` page has places and a number for them, and the
   * number is an artefact of the wrong pair; `0` would read as *nothing here
   * went unread*, which is the opposite of what is known. The standing is where
   * *there is no figure* is said.
   */
  readonly costs: number | null
  /**
   * What share of the page's parts that one place accounts for, or `null` on the
   * same terms as {@link PageUnread.costs}.
   *
   * The tie-break and the sentence a small page needs: forty parts behind one
   * band is most of a fifty-part page and a corner of a four-hundred-part one.
   */
  readonly share: number | null
}

/** One place the reading of a page stopped, with the page it is on. */
export type DeploymentPlace = {
  readonly treeId: TreeId
  readonly revision: number
  readonly audienceId: AudienceId | null
  /** The place itself, carried whole off its page's reading. */
  readonly at: UnreachedPart
  /** What share of that page's parts this one place accounts for. */
  readonly share: number
}

/** A deployment's pages, by what one fix to each would recover. */
export type DeploymentUnread = {
  /**
   * Every page with a place the reading stopped and a sound pair behind it,
   * worst first.
   *
   * Most parts behind one place, then the larger share of the page, then by tree
   * id and newest revision first — so two pages that cost the same do not
   * reorder on a refresh.
   */
  readonly ranked: readonly PageUnread[]
  /** Every other page, by tree id and newest revision first. */
  readonly unranked: readonly PageUnread[]
  /** The head of the order, which is the one place in this deployment to go to first. */
  readonly worst: PageUnread | null
  /** How many pages stand in each state, over the ranked and the unranked alike. */
  readonly standings: Readonly<Record<UnreadStanding, number>>
  /**
   * Distinct trees across every page read, which is not the number of pages.
   *
   * Two revisions of one tree are two live versions of one page and both stand,
   * as they do in every order under this (0250, 0271).
   */
  readonly trees: number
  /**
   * Places the reading stopped, added across the **ranked** pages.
   *
   * The half of the headline that is the number of things to do. A `mismatched`
   * page's places are not in it, because a figure taken off a wrong pair is not
   * a thing to do — the row carries them, so nothing is lost by leaving them out
   * of the sum (0301, 0326).
   */
  readonly places: number
  /**
   * Parts nobody reached, added across the **ranked** pages.
   *
   * The other half, and the figure a screen would otherwise have printed on its
   * own: *four hundred and twelve unread parts* is true and is nine things to
   * fix. Addable because a part is a node of one revision counted once — a
   * weight over the pages the caller read, and not a deployment total.
   */
  readonly unseen: number
  /**
   * Pages whose reading names a part that said nothing while a part inside it
   * reported reach — a **slice** of the rows and not a further list.
   *
   * A fix in the library rather than a page to rewrite: a reader was
   * demonstrably below the part, so it was on screen and did not say so, which
   * is a primitive not spreading its identity attributes. In the rows' own
   * order, and every page here is in `ranked` or `unranked` as well and counted
   * once in both this and {@link DeploymentUnread.standings}.
   */
  readonly notReporting: readonly PageUnread[]
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * in an order is the one way an order lies about how much there is to fix.
   * Dropped rather than added, because a count that has been added cannot be
   * unadded (0158).
   */
  readonly duplicated: number
}

const EMPTY_STANDINGS: Readonly<Record<UnreadStanding, number>> = Object.freeze(
  Object.fromEntries(UNREAD_STANDINGS.map((standing) => [standing, 0])) as Record<
    UnreadStanding,
    number
  >
)

/** Tree id, then newest revision first, then form — the order every reading here publishes. */
const byPage = (one: PageUnread, other: PageUnread): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision ||
  (one.audienceId ?? "").localeCompare(other.audienceId ?? "")

/**
 * What one reading's emptiness was, asked in the order the wrong answers are
 * comforting in.
 *
 * `mismatched` first, because a wrong pair produces places and figures and they
 * are the most plausible-looking output this reading has. Then `unsplit` before
 * `unread`, because a window read as neither of two forms has a view floor of
 * nought while its counters are full, so *nobody opened this page* is the
 * comforting half of that pair too. Only then is an empty frontier allowed to
 * mean what it looks like.
 */
const standingOf = (reading: PageFrontier): UnreadStanding => {
  if (reading.orphaned > 0) return "mismatched"
  if (audienceScopeRead(reading).reading === "mixed") return "unsplit"
  if (reading.views === 0) return "unread"

  return reading.frontier.length > 0 ? "ranked" : "whole"
}

const rowOf = (reading: PageFrontier): PageUnread => {
  const standing = standingOf(reading)
  const at = standing === "ranked" ? (largestUnreachedIn(reading, 1)[0] ?? null) : null

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    audienceId: reading.audienceId,
    standing,
    reading,
    at,
    costs: at?.unseen ?? null,
    share: at === null || reading.parts === 0 ? null : at.unseen / reading.parts,
  }
}

/** Most parts behind one place, then the larger share, then the page order. */
const byCost = (one: PageUnread, other: PageUnread): number =>
  (other.costs ?? 0) - (one.costs ?? 0) ||
  (other.share ?? 0) - (one.share ?? 0) ||
  byPage(one, other)

/**
 * Read a deployment's pages as the places their readings stopped.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const unread = deploymentUnreadOf(assembly.readings.pages.map(pageFrontierOf))
 * ```
 *
 * The frontiers are handed in rather than derived from a window here, for the
 * reason every derived reading in this subsystem takes readings: each is
 * separately useful and separately drawn, and deriving one twice is how two
 * screens come to disagree about one page.
 *
 * @param pages One frontier per page the caller read. Two readings of one page
 * are one page: they are keyed on a tree, a revision **and** an audience
 * (`readingKeyOf`), the first of them stands, and the rest are counted in
 * {@link DeploymentUnread.duplicated} rather than quietly doubling a figure.
 */
export const deploymentUnreadOf = (pages: readonly PageFrontier[]): DeploymentUnread => {
  const first = new Map<string, PageUnread>()
  let duplicated = 0

  for (const reading of pages) {
    const key = readingKeyOf(reading)

    if (first.has(key)) duplicated += 1
    else first.set(key, rowOf(reading))
  }

  const rows = [...first.values()].sort(byPage)
  const ranked = rows.filter((row) => row.standing === "ranked").sort(byCost)

  const standings = rows.reduce<Record<UnreadStanding, number>>(
    (counted, row) => ({ ...counted, [row.standing]: counted[row.standing] + 1 }),
    { ...EMPTY_STANDINGS }
  )

  return {
    ranked,
    unranked: rows.filter((row) => row.standing !== "ranked"),
    worst: ranked[0] ?? null,
    standings,
    trees: new Set(rows.map((row) => row.treeId)).size,
    places: ranked.reduce((total, row) => total + row.reading.frontier.length, 0),
    unseen: ranked.reduce((total, row) => total + row.reading.unseen, 0),
    notReporting: rows.filter((row) => row.reading.notReporting.length > 0),
    duplicated,
  }
}

/**
 * Every place the reading stopped across the deployment, worst first.
 *
 * The question the per-page reading could not be asked: *where in this
 * deployment is the one place worth going to*, over nine pages rather than one.
 * By what each place accounts for, then by the share of its own page, then by
 * the page order and the page's own reading order — so a refresh does not
 * reshuffle two places of one size.
 *
 * **Only the ranked pages.** A `mismatched` page's places are artefacts of a
 * wrong tree-and-window pair, and this is the list whose rows are furthest from
 * the standing that says so, so they are left out rather than drawn with a flag
 * nobody reads. They are on the row, in `unranked`, where the order put them.
 */
export const worstPlacesIn = (
  unread: DeploymentUnread,
  limit?: number
): readonly DeploymentPlace[] => {
  const places = unread.ranked.flatMap((row) =>
    largestUnreachedIn(row.reading).map((at) => ({
      treeId: row.treeId,
      revision: row.revision,
      audienceId: row.audienceId,
      at,
      share: row.reading.parts === 0 ? 0 : at.unseen / row.reading.parts,
    }))
  )

  const ordered = places.sort(
    (one, other) => other.at.unseen - one.at.unseen || other.share - one.share
  )

  return limit === undefined ? ordered : ordered.slice(0, limit)
}
