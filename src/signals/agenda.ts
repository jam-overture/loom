import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { readingKeyOf, type ReadingOfAudience } from "./audiences.js"
import type { DeploymentReading, RankedPage } from "./deployment.js"
import { spoilsTheLoss, type CollectionHealth, type PageHealth } from "./health.js"

/**
 * Whether the page at the head of a deployment's fix-list is a page to rewrite
 * or a measurement to repair.
 *
 * Two readings answer *what should this deployment do next* and they have never
 * met. An order of pages ranks every page by the readers it loses at its
 * sharpest fall
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)),
 * and the head of it is *the page to fix first*. A health reading names the
 * faults in the deployment's own collection and ranks them by the readers each
 * costs
 * ([0271](../../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)).
 * Both are over the same pages, both are at the door's scale, and **nothing
 * joins them** — so an operator holds two lists and has to find the overlap by
 * eye.
 *
 * The overlap is the dangerous part, and it is dangerous in one direction. A
 * page whose counters name nodes its tree does not contain reads mostly
 * `skipped` (0212), which **manufactures the steepest fall in the deployment**
 * and puts it at the head of the order. The instruction an operator takes from
 * that is *go and rewrite this page*, the page is fine, and the figure that sent
 * them there was the fault. A fix-list whose first row is an artefact is worse
 * than no fix-list, because it spends the one thing a reader screen is for.
 *
 * So this publishes **two orders and the overlap between them**, taken off the
 * two readings and nothing else: no payload field, no counter, no column, no
 * byte on any wire and no figure either reading does not already publish.
 *
 * ## It publishes no reader count, and that is the rule rather than an omission
 *
 * The two orders are ranked in **two different units.** 0250's key is *readers
 * lost at one fall*, a part of a page's readership. 0271's is *the page's whole
 * readership*, because a fault spoils every rate on the page rather than some
 * share of them. Both are headcounts at the door's scale and they are not the
 * same quantity, so a sum over them would be a figure in neither — the refusal
 * [0327](../../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
 * makes about a withheld bucket, a kind with no pace and a silent reading.
 *
 * Every figure here is therefore a count of **pages**, and every reader figure
 * on a row is the source reading's own, carried on the source reading's own row
 * rather than re-spelled (0265's rule applied to a join rather than to a scale).
 *
 * ## Which faults take a page out of the order, and which do not
 *
 * {@link spoilsTheLoss}, published beside the fault vocabulary it is about. Two
 * of the seven faults do not reach the ranking key at all — a window shorter
 * than a visit is already divided out of it, and an uncredited sender spends a
 * counter no fall is made of — so a page carrying either keeps its place in the
 * order with the fault named beside it. That is {@link AgendaWork} `both`, and
 * it is the member that stops this reading from being the over-caution that
 * sends an operator to repair a sender while four hundred readers a day stop at
 * a band.
 *
 * ## A contested page leaves the order and says so
 *
 * A page the order ranked and a fault spoiled is collection work: its place was
 * computed from counters the fault produced, so *rewrite this* is not a safe
 * instruction. It is published in {@link DeploymentAgenda.collection} **and**
 * named in {@link DeploymentAgenda.contested}, carrying the whole row the order
 * gave it — never dropped quietly, which is the rule this subsystem keeps about
 * every refusal it makes (0301, 0326): a page taken out of an order has to be
 * findable in the place it was taken to, with the figure it was taken for.
 *
 * ## A page is counted once, however many lists name it
 *
 * The one permanent mistake available to a join of two orders is a page counted
 * twice (0158), and there are two ways in. A caller that concatenated two reads
 * holds one page twice on one side: deduplicated on `readingKeyOf` and counted
 * in {@link DeploymentAgenda.duplicated}. And `contested` is a **slice** of
 * `collection` rather than a fourth list, so the work counts add to the pages
 * read and not to more than there are.
 *
 * ## Two windows handed in as one
 *
 * Both inputs are over *the pages their caller read*, and a caller holding an
 * order of one window and a health reading of another gets a join that is
 * silently of the intersection. A row only one side names is in no list and is
 * counted in {@link DeploymentAgenda.unpaired}, which is nought for every
 * caller that read one window and is the alarm for the one that did not.
 *
 * Pure, linear in the two readings, and reaches no store, clock or DOM.
 */

/** What the next thing to do about one page is. */
export type AgendaWork =
  /**
   * Rewrite the page: it is in the order, and nothing in its collection reaches
   * the figure that put it there.
   */
  | "page"
  /**
   * Repair the measurement: it is faulted, and either the order never ranked it
   * or a fault reaches the loss it was ranked by.
   */
  | "collection"
  /**
   * Both, and in that order.
   *
   * The page is ranked, the rank is evidence, and there is also a fault on it
   * that {@link spoilsTheLoss} says does not reach the ranking key. A surface
   * may draw it in either list; it is one page and is counted once.
   */
  | "both"
  /**
   * Nothing either reading asks for.
   *
   * Sound collection and no fall — or no fall anybody could read, which is the
   * same row in this reading and two different sentences on it:
   * {@link AgendaRow.order}'s standing says which.
   */
  | "none"

export const AGENDA_WORK: readonly AgendaWork[] = everyMemberOf<AgendaWork>()([
  "page",
  "collection",
  "both",
  "none",
])

/** One line per member, for a surface saying what a row is asking for. */
export const describeAgendaWork = (work: AgendaWork): string => {
  switch (work) {
    case "page":
      return "rewrite the page: its readers stop somewhere and the figure can be trusted"
    case "collection":
      return "repair the measurement: what this page reports cannot be acted on"
    case "both":
      return "rewrite the page, and repair a fault that does not reach where its readers stop"
    case "none":
      return "nothing either reading asks for"
  }
}

/** One page of a deployment, as both readings have it. */
export type AgendaRow = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The audience this row is about, or `null` where the readings named none.
   *
   * Two forms of one page are two rows, which is what both readings under this
   * publish and what `readingKeyOf` joins them on: the two forms' losses are
   * losses from two populations and a join that merged them would be asking one
   * question of two readerships (0300).
   */
  readonly audienceId: AudienceId | null
  readonly work: AgendaWork
  /**
   * Whether a fault reaches the loss the order ranked this page by.
   *
   * **False on a page the order did not rank**, and that is a claim rather than
   * a default: there is no loss on such a row to be spoiled, and `true` would
   * read as *the figure is wrong* where the honest sentence is *there is no
   * figure*. The standing on {@link AgendaRow.order} is where that is said.
   */
  readonly spoiled: boolean
  /** The page as the order has it, carried whole and unchanged. */
  readonly order: RankedPage
  /** The page as the health reading has it, carried whole and unchanged. */
  readonly health: PageHealth
}

/** A deployment's pages, in the two orders that say what to do about them. */
export type DeploymentAgenda = {
  /**
   * Every page both readings named, by tree id and newest revision first.
   *
   * The same order `CollectionHealth.pages` and an order's `unranked` are in, so
   * a surface holding all three can draw them side by side.
   */
  readonly rows: readonly AgendaRow[]
  /**
   * Pages to rewrite, worst first, in the order's own order.
   *
   * {@link AgendaWork} `page` and `both`. A row's place here is the place the
   * order gave it, unchanged (0250) — nothing is re-ranked, because the ranking
   * rule lives in one place.
   */
  readonly page: readonly AgendaRow[]
  /**
   * Pages whose collection to repair, worst first, in the health reading's own
   * order: the priced faults by the readers each costs, then the ones the door
   * cannot price.
   *
   * {@link AgendaWork} `collection` and `both`.
   */
  readonly collection: readonly AgendaRow[]
  /**
   * Pages the order ranked and a fault spoiled — a **slice** of
   * {@link DeploymentAgenda.collection} and not a fourth list, so nothing here
   * is counted twice.
   *
   * The sharpest rows in the deployment: each one is high in a fix-list for a
   * figure its own fault may have produced. Each carries the rank it was taken
   * out of.
   */
  readonly contested: readonly AgendaRow[]
  /**
   * The one thing to do first, or `null` where both readings ask for nothing.
   *
   * A contested page before a ranked one, because while one exists the order
   * itself is not evidence; then the head of the order, which is the order's own
   * answer (0250), now that it is safe to act on; then the worst fault, for a
   * deployment with nothing ranked at all.
   */
  readonly first: AgendaRow | null
  /** How many pages ask for each kind of work, over every row. */
  readonly work: Readonly<Record<AgendaWork, number>>
  /**
   * Distinct trees across the rows, which is not the number of pages.
   *
   * Two revisions of one tree are two live versions of one page and both stand,
   * as they do in both readings under this (0250, 0271).
   */
  readonly trees: number
  /**
   * Rows one reading named and the other did not, which is two windows handed
   * in as one.
   *
   * Nought for a caller that read one window. Anything else is a caller holding
   * an order of one and a health reading of another, and the join below it is
   * then of the intersection — so this is published rather than refused, and it
   * is published as two counts because which side is short says which read is
   * the stale one.
   */
  readonly unpaired: {
    /** Rows the order named that the health reading has no page for. */
    readonly order: number
    /** Rows the health reading named that the order has no page for. */
    readonly health: number
  }
  /**
   * Readings of a page beyond the first, on either side, which were dropped.
   *
   * A caller that concatenated two reads. Dropped rather than added, because a
   * page twice in an order is the one way an order can lie about how much there
   * is to fix, and a count that has been added cannot be unadded (0158).
   */
  readonly duplicated: number
}

const EMPTY_WORK: Readonly<Record<AgendaWork, number>> = Object.freeze(
  Object.fromEntries(AGENDA_WORK.map((work) => [work, 0])) as Record<AgendaWork, number>
)

/** Tree id, then newest revision first, then form — the order both readings publish. */
const byPage = (one: AgendaRow, other: AgendaRow): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision ||
  (one.audienceId ?? "").localeCompare(other.audienceId ?? "")

/**
 * Rows filed under `readingKeyOf`, with the first appearance of a key kept.
 *
 * The first and not the last for the reason the counter fold keeps the standing
 * row: a caller's two reads of one page are the same page, and which of the two
 * copies is answered must not depend on the order they were concatenated in.
 */
const byKey = <Row extends ReadingOfAudience>(
  rows: readonly Row[]
): { readonly first: ReadonlyMap<string, Row>; readonly duplicated: number } => {
  const first = new Map<string, Row>()
  let duplicated = 0

  for (const row of rows) {
    const key = readingKeyOf(row)

    if (first.has(key)) duplicated += 1
    else first.set(key, row)
  }

  return { first, duplicated }
}

const workOf = (ranked: boolean, faulted: boolean, spoiled: boolean): AgendaWork => {
  if (!faulted) return ranked ? "page" : "none"

  return ranked && !spoiled ? "both" : "collection"
}

const asksForPage = (row: AgendaRow): boolean => row.work === "page" || row.work === "both"

const asksForCollection = (row: AgendaRow): boolean =>
  row.work === "collection" || row.work === "both"

/**
 * Join an order of a deployment's pages to the health of its collection, and
 * publish the two orders that come out.
 *
 * ```ts
 * const progress = assembly.readings.pages.map(readingProgressOf)
 * const agenda = deploymentAgendaOf(
 *   deploymentReadingOf(progress, window.pageViews),
 *   collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)
 * )
 * ```
 *
 * Both readings are handed in rather than derived from a window here, for the
 * reason every derived reading in this subsystem takes readings: each is
 * separately useful and separately drawn, and deriving either a second time is
 * how two screens come to disagree about one deployment.
 */
export const deploymentAgendaOf = (
  order: DeploymentReading,
  health: CollectionHealth
): DeploymentAgenda => {
  const ranked = byKey<RankedPage>([...order.ranked, ...order.unranked])
  const states = byKey<PageHealth>(health.pages)

  const rowOf = (page: RankedPage): AgendaRow | null => {
    const key = readingKeyOf(page)
    const state = states.first.get(key)

    if (state === undefined) return null

    const faulted = state.standing === "faulted"
    const spoiled = page.standing === "ranked" && state.faults.some(spoilsTheLoss)

    return {
      treeId: page.treeId,
      revision: page.revision,
      audienceId: page.audienceId,
      work: workOf(page.standing === "ranked", faulted, spoiled),
      spoiled,
      order: page,
      health: state,
    }
  }

  /**
   * One row per key, built once and looked up by every order below — so the two
   * orders and the slice are three views of one set of rows rather than three
   * constructions of it, and `work` cannot differ between them.
   */
  const joined = new Map<string, AgendaRow>()

  for (const page of ranked.first.values()) {
    const row = rowOf(page)

    if (row !== null) joined.set(readingKeyOf(page), row)
  }

  const rows = [...joined.values()].sort(byPage)

  /**
   * The rows of one source list, in that list's own order, each at most once.
   *
   * **The dedup is here as well as on the join**, which is the one thing a
   * reader of this file should not simplify away: the published orders walk the
   * caller's lists rather than the joined map, so a caller's two reads of one
   * page put the page in an order twice while the counts above it stay right —
   * and a page twice in an order is exactly how an order lies about how much
   * there is to fix (0250, 0158).
   */
  const taken = <Row extends ReadingOfAudience>(
    pages: readonly Row[],
    wanted: (row: AgendaRow) => boolean,
    already: Set<string>
  ): readonly AgendaRow[] =>
    pages.flatMap((page) => {
      const key = readingKeyOf(page)
      const row = joined.get(key)

      if (row === undefined || already.has(key) || !wanted(row)) return []

      already.add(key)

      return [row]
    })

  const inCollection = new Set<string>()

  const page = taken(order.ranked, asksForPage, new Set())
  const collection = [
    ...taken(health.faulted, asksForCollection, inCollection),
    ...taken(health.unpriced, asksForCollection, inCollection),
  ]
  const contested = collection.filter((row) => row.spoiled)

  const work = rows.reduce<Record<AgendaWork, number>>(
    (counted, row) => ({ ...counted, [row.work]: counted[row.work] + 1 }),
    { ...EMPTY_WORK }
  )

  return {
    rows,
    page,
    collection,
    contested,
    first: contested[0] ?? page[0] ?? collection[0] ?? null,
    work,
    trees: new Set(rows.map((row) => row.treeId)).size,
    unpaired: {
      order: ranked.first.size - joined.size,
      health: states.first.size - joined.size,
    },
    duplicated: ranked.duplicated + states.duplicated,
  }
}
