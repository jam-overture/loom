import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { readingKeyOf, type ReadingOfAudience } from "./audiences.js"
import type { DeploymentConversion, LeakingPage } from "./conversion.js"
import type { DeploymentReading, RankedPage } from "./deployment.js"
import {
  spoilsTheConversion,
  spoilsTheLoss,
  type CollectionHealth,
  type PageHealth,
} from "./health.js"

/**
 * Whether the page at the head of a deployment's fix-list is a page to rewrite
 * or a measurement to repair.
 *
 * Three readings answer *what should this deployment do next* and they have
 * never met. An order of pages ranks every page by the readers it loses at its
 * sharpest fall
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)),
 * and the head of it is *the page to fix first*. A second order ranks every page
 * by the readers it loses between the two ends of its sharpest question
 * ([0333](../../decisions/0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)),
 * and the head of it is *the funnel to fix first*. A health reading names the
 * faults in the deployment's own collection and ranks them by the readers each
 * costs
 * ([0271](../../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)).
 * All three are over the same pages, all three are at the door's scale, and
 * **nothing joins them** — so an operator holds three lists and has to find the
 * overlap by eye.
 *
 * The overlap is the dangerous part, and it is dangerous in one direction. A
 * page whose counters name nodes its tree does not contain reads mostly
 * `skipped` (0212), which **manufactures the steepest fall in the deployment**
 * and puts it at the head of the order. The instruction an operator takes from
 * that is *go and rewrite this page*, the page is fine, and the figure that sent
 * them there was the fault. A fix-list whose first row is an artefact is worse
 * than no fix-list, because it spends the one thing a reader screen is for.
 *
 * So this publishes **three orders and the overlaps between them**, taken off
 * the three readings and nothing else: no payload field, no counter, no column,
 * no byte on any wire and no figure any reading does not already publish.
 *
 * ## Two kinds of page work, in two units, never merged
 *
 * A fall and a leak are both the page writer's to fix, and the readers they
 * cost are **two quantities**: readers lost at one fall, and readers lost
 * between the two ends of one question. So they are published as two orders in
 * two keys — {@link DeploymentAgenda.page} and
 * {@link DeploymentAgenda.converting} — and never ranked against each other,
 * which is the refusal 0327 makes about adding figures in different units and
 * 0333 makes about ranking one event in two orders.
 *
 * {@link AgendaWork} does not gain a member for it, and that is the one
 * judgement in this file worth stating out loud. The vocabulary answers *whose
 * hand*, not *which part of the page*: a leak is the page writer's work exactly
 * as a fall is, so `page` covers both and the row says which evidence it has.
 * Widening the set to a third dimension would give eight combinations over a
 * flat set of four and would rename `both`, which is a change to an accepted
 * vocabulary rather than an addition to it (0330, 0335).
 *
 * ## It publishes no reader count, and that is the rule rather than an omission
 *
 * The three orders are ranked in **three different units.** 0250's key is
 * *readers lost at one fall*, a part of a page's readership. 0333's is *readers
 * lost between one question's two ends*, a part of the readers who reached it.
 * 0271's is *the page's whole readership*, because a fault spoils every rate on
 * the page rather than some share of them. All three are headcounts at the
 * door's scale and no two are the same quantity, so a sum over them would be a
 * figure in none — the refusal
 * [0327](../../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
 * makes about a withheld bucket, a kind with no pace and a silent reading.
 *
 * Every figure here is therefore a count of **pages**, and every reader figure
 * on a row is the source reading's own, carried on the source reading's own row
 * rather than re-spelled (0265's rule applied to a join rather than to a scale).
 *
 * ## Which faults take a page out of the order, and which do not
 *
 * {@link spoilsTheLoss} and {@link spoilsTheConversion}, published beside the
 * fault vocabulary they are about. Two of the seven faults do not reach the
 * **fall's** ranking key — a window shorter than a visit is already divided out
 * of it, and an uncredited sender spends a counter no fall is made of — so a
 * page carrying either keeps its place in the order of falls with the fault
 * named beside it. That is {@link AgendaWork} `both`, and it is the member that
 * stops this reading from being the over-caution that sends an operator to
 * repair a sender while four hundred readers a day stop at a band.
 *
 * **The two answers are not interchangeable and this reading asks each
 * separately**, which is the defect 0335 was written to make impossible. Only
 * one of the seven survives the conversion key, and it is not the same one: a
 * rollup window shorter than the visits being measured *manufactures* a
 * conversion loss, because `converted` is a conjunction inside one window and a
 * conversion split across two is lost rather than double-counted (0147). So a
 * page that keeps its place in the order of falls with `counts-inflated` on it
 * loses its place in the order of conversions, and one row can be sound
 * evidence in one order and an artefact in the other.
 *
 * ## A contested page leaves the order and says so
 *
 * A page an order ranked and a fault spoiled is collection work: its place was
 * computed from counters the fault produced, so *rewrite this* is not a safe
 * instruction. It is published in {@link DeploymentAgenda.collection} **and**
 * named in {@link DeploymentAgenda.contested}, carrying the whole row the order
 * gave it — never dropped quietly, which is the rule this subsystem keeps about
 * every refusal it makes (0301, 0326): a page taken out of an order has to be
 * findable in the place it was taken to, with the figure it was taken for.
 *
 * Per order, because a fault reaches one key and not the other.
 * {@link AgendaRow.spoiled} is about the fall and
 * {@link AgendaRow.spoiledConversion} about the leak, and the row stands in
 * whichever page order its evidence survives — so a page with `counts-inflated`
 * on it is in {@link DeploymentAgenda.page}, out of
 * {@link DeploymentAgenda.converting}, and in
 * {@link DeploymentAgenda.contested} saying which half was withdrawn.
 *
 * ## A page is counted once, however many lists name it
 *
 * The one permanent mistake available to a join of three orders is a page
 * counted twice (0158), and there are two ways in. A caller that concatenated
 * two reads holds one page twice on one side: deduplicated on `readingKeyOf` and
 * counted in {@link DeploymentAgenda.duplicated}. And `contested` is a **slice**
 * of `collection` rather than a list beside it, so the work counts add to the
 * pages read and not to more than there are. A page in both page orders is one
 * row object in both lists and one entry in {@link DeploymentAgenda.work}.
 *
 * ## Two windows handed in as one
 *
 * All three inputs are over *the pages their caller read*, and a caller holding
 * an order of one window and a health reading of another gets a join that is
 * silently of the intersection. A row some side does not name is in no list and
 * is counted in {@link DeploymentAgenda.unpaired}, which is nought for every
 * caller that read one window and is the alarm for the one that did not.
 *
 * **The conversion order is taken rather than defaulted**, which costs every
 * caller a line and is the point. The three readings come off one window in
 * three lines (0327, 0333), and an argument a caller may omit is a fix-list
 * that type-checks, runs, and says `none` about the half of the product that
 * pays — which is the hazard this subsystem has now recorded in four places. A
 * deployment that asks nothing of its readers hands in the order it gets, in
 * which every page is `unasked`, and reads exactly as it did before 0335.
 *
 * Pure, linear in the three readings, and reaches no store, clock or DOM.
 */

/**
 * What the next thing to do about one page is.
 *
 * Four members over *whose hand the work falls to*, which is deliberately not
 * the same axis as *which part of the page*. A page that loses readers while
 * they read and a page that loses them at an ask are both `page`; the row's own
 * {@link AgendaRow.order} and {@link AgendaRow.conversion} say which, and they
 * say it in the two readings' own figures (0335).
 */
export type AgendaWork =
  /**
   * Rewrite the page: an order ranked it, and nothing in its collection reaches
   * the figure that put it there.
   *
   * Either order — readers stopping where they read, readers stopping at an ask,
   * or both. The sentence an operator acts on is the same one and the part of
   * the page is on the row.
   */
  | "page"
  /**
   * Repair the measurement: it is faulted, and either no order ranked it or a
   * fault reaches every loss it was ranked by.
   */
  | "collection"
  /**
   * Both, and in that order.
   *
   * At least one order ranked the page, that rank is evidence —
   * {@link spoilsTheLoss} or {@link spoilsTheConversion} says no fault on the
   * row reaches the key it was ranked by — and there is also a fault. A surface
   * may draw it in either list; it is one page and is counted once.
   */
  | "both"
  /**
   * Nothing any of the three readings asks for.
   *
   * Sound collection, no fall and no leak — or none anybody could read, which
   * is the same row in this reading and several different sentences on it: the
   * standings on {@link AgendaRow.order} and {@link AgendaRow.conversion} say
   * which.
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
      return "rewrite the page: its readers stop reading or stop answering, and the figure can be trusted"
    case "collection":
      return "repair the measurement: what this page reports cannot be acted on"
    case "both":
      return "rewrite the page, and repair a fault that does not reach the figure it was ranked by"
    case "none":
      return "nothing any of the three readings asks for"
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
   * Whether a fault reaches the loss the order of falls ranked this page by.
   *
   * **False on a page that order did not rank**, and that is a claim rather than
   * a default: there is no loss on such a row to be spoiled, and `true` would
   * read as *the figure is wrong* where the honest sentence is *there is no
   * figure*. The standing on {@link AgendaRow.order} is where that is said.
   *
   * Its name and its meaning are unchanged (0330), and it says nothing about the
   * other order — {@link AgendaRow.spoiledConversion} does, and no surface may
   * read one off the other (0335).
   */
  readonly spoiled: boolean
  /**
   * Whether a fault reaches the loss the order of conversions ranked this page
   * by.
   *
   * False on a page that order did not rank, on the same terms and for the same
   * reason as {@link AgendaRow.spoiled}: the standing on
   * {@link AgendaRow.conversion} is where *there is no figure* is said.
   *
   * **It is not {@link AgendaRow.spoiled} with the word changed.** The two can
   * disagree on one row, and the fault that makes them disagree is the ordinary
   * one — a rollup window shorter than the visits being measured is divided out
   * of a fall and manufactures a leak (0147, 0335).
   */
  readonly spoiledConversion: boolean
  /** The page as the order of falls has it, carried whole and unchanged. */
  readonly order: RankedPage
  /** The page as the order of conversions has it, carried whole and unchanged. */
  readonly conversion: LeakingPage
  /** The page as the health reading has it, carried whole and unchanged. */
  readonly health: PageHealth
}

/** A deployment's pages, in the two orders that say what to do about them. */
export type DeploymentAgenda = {
  /**
   * Every page all three readings named, by tree id and newest revision first.
   *
   * The same order `CollectionHealth.pages` and an order's `unranked` are in, so
   * a surface holding all of them can draw them side by side.
   */
  readonly rows: readonly AgendaRow[]
  /**
   * Pages whose **reading** falls, worst first, in the order of falls' own
   * order.
   *
   * Every row here is {@link AgendaWork} `page` or `both`, and the converse does
   * not hold: a page that only leaks is `page` work and stands in
   * {@link DeploymentAgenda.converting} instead. A row's place here is the place
   * the order gave it, unchanged (0250) — nothing is re-ranked, because the
   * ranking rule lives in one place.
   */
  readonly page: readonly AgendaRow[]
  /**
   * Pages whose **asks** leak, worst first, in the order of conversions' own
   * order (0333).
   *
   * The second half of the page writer's work, and a list of its own rather
   * than rows appended to {@link DeploymentAgenda.page}, because the two keys
   * are readers in two units and merging them would publish a rank in neither
   * (0327, 0335). A page may stand in both lists, and is one page in every
   * count here.
   */
  readonly converting: readonly AgendaRow[]
  /**
   * Pages whose collection to repair, worst first, in the health reading's own
   * order: the priced faults by the readers each costs, then the ones the door
   * cannot price.
   *
   * {@link AgendaWork} `collection` and `both`.
   */
  readonly collection: readonly AgendaRow[]
  /**
   * Pages an order ranked and a fault spoiled — a **slice** of
   * {@link DeploymentAgenda.collection} and not a further list, so nothing here
   * is counted twice.
   *
   * The sharpest rows in the deployment: each one is high in a fix-list for a
   * figure its own fault may have produced. Each carries the ranks it was taken
   * out of, and says which of the two was withdrawn —
   * {@link AgendaRow.spoiled}, {@link AgendaRow.spoiledConversion} or both,
   * since a fault need not reach both keys (0335).
   */
  readonly contested: readonly AgendaRow[]
  /**
   * The one thing to do first, or `null` where the three readings ask for
   * nothing.
   *
   * A contested page before a ranked one, because while one exists an order is
   * not evidence; then the head of the order of falls, which is that order's own
   * answer (0250), now that it is safe to act on; then the head of the order of
   * conversions; then the worst fault, for a deployment with nothing ranked at
   * all.
   *
   * **Falls before leaks, and the reason is causal rather than a comparison of
   * magnitudes** — there is no comparing them, since the two keys are readers in
   * two units. A reader who never reached an ask stopped *reading*, and the
   * order of falls is deliberately where that reader is left (0333); so a leak
   * is a question about readers who did arrive, and rewriting an ask that
   * readers do not reach is work on a part of the page nobody sees.
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
    /** Rows the order of falls named that some other reading has no page for. */
    readonly order: number
    /** Rows the health reading named that some other reading has no page for. */
    readonly health: number
    /**
     * Rows the order of conversions named that some other reading has no page
     * for.
     *
     * Nought for a caller that read one window, including a deployment that
     * asks nothing of its readers: a page with no question is `unasked` in that
     * order rather than absent from it, so the three page sets match (0333).
     */
    readonly conversion: number
  }
  /**
   * Readings of a page beyond the first, on any side, which were dropped.
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

/**
 * What one row asks for, out of what each order ranked and what a fault reaches.
 *
 * `evidence` is *at least one rank this deployment may act on* — a fall no fault
 * reaches, or a leak no fault reaches. The two are asked separately because the
 * two answers differ (0335), and `ranked` is *either order put the page in it*,
 * because a page with a rank nobody may act on is collection work whichever
 * order gave it.
 */
const workOf = (ranked: boolean, faulted: boolean, evidence: boolean): AgendaWork => {
  if (!faulted) return ranked ? "page" : "none"

  return evidence ? "both" : "collection"
}

/**
 * Whether this row belongs in a page order, asked **per order** rather than off
 * {@link AgendaRow.work}.
 *
 * `work` is `page` or `both` wherever *some* rank is evidence, so reading it to
 * fill both lists would put a page whose fall a fault manufactured into the
 * order of falls on the strength of its sound leak, and the other way round.
 * That is the 0330 defect reintroduced by a shortcut, and it is the one thing a
 * reader of this file should not simplify back (0335).
 */
const asksToRewriteTheFall = (row: AgendaRow): boolean =>
  row.order.standing === "ranked" && !row.spoiled

const asksToRewriteTheLeak = (row: AgendaRow): boolean =>
  row.conversion.standing === "ranked" && !row.spoiledConversion

const asksForCollection = (row: AgendaRow): boolean =>
  row.work === "collection" || row.work === "both"

/**
 * Join an order of a deployment's pages to the health of its collection, and
 * publish the two orders that come out.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const progress = assembly.readings.pages.map(readingProgressOf)
 * const agenda = deploymentAgendaOf(
 *   deploymentReadingOf(progress, window.pageViews),
 *   deploymentConversionOf(windowFunnelsOf(window, assembly).pages),
 *   collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)
 * )
 * ```
 *
 * The three readings are handed in rather than derived from a window here, for
 * the reason every derived reading in this subsystem takes readings: each is
 * separately useful and separately drawn, and deriving any of them a second time
 * is how two screens come to disagree about one deployment.
 */
export const deploymentAgendaOf = (
  order: DeploymentReading,
  conversion: DeploymentConversion,
  health: CollectionHealth
): DeploymentAgenda => {
  const ranked = byKey<RankedPage>([...order.ranked, ...order.unranked])
  const leaks = byKey<LeakingPage>([...conversion.ranked, ...conversion.unranked])
  const states = byKey<PageHealth>(health.pages)

  const rowOf = (page: RankedPage): AgendaRow | null => {
    const key = readingKeyOf(page)
    const state = states.first.get(key)
    const leak = leaks.first.get(key)

    if (state === undefined || leak === undefined) return null

    const faulted = state.standing === "faulted"
    const fell = page.standing === "ranked"
    const leaked = leak.standing === "ranked"
    const spoiled = fell && state.faults.some(spoilsTheLoss)
    const spoiledConversion = leaked && state.faults.some(spoilsTheConversion)

    return {
      treeId: page.treeId,
      revision: page.revision,
      audienceId: page.audienceId,
      work: workOf(fell || leaked, faulted, (fell && !spoiled) || (leaked && !spoiledConversion)),
      spoiled,
      spoiledConversion,
      order: page,
      conversion: leak,
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

  const page = taken(order.ranked, asksToRewriteTheFall, new Set())
  const converting = taken(conversion.ranked, asksToRewriteTheLeak, new Set())
  const collection = [
    ...taken(health.faulted, asksForCollection, inCollection),
    ...taken(health.unpriced, asksForCollection, inCollection),
  ]
  const contested = collection.filter((row) => row.spoiled || row.spoiledConversion)

  const work = rows.reduce<Record<AgendaWork, number>>(
    (counted, row) => ({ ...counted, [row.work]: counted[row.work] + 1 }),
    { ...EMPTY_WORK }
  )

  return {
    rows,
    page,
    converting,
    collection,
    contested,
    first: contested[0] ?? page[0] ?? converting[0] ?? collection[0] ?? null,
    work,
    trees: new Set(rows.map((row) => row.treeId)).size,
    unpaired: {
      order: ranked.first.size - joined.size,
      health: states.first.size - joined.size,
      conversion: leaks.first.size - joined.size,
    },
    duplicated: ranked.duplicated + leaks.duplicated + states.duplicated,
  }
}
