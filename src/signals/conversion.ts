import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { audienceScopeRead, readingKeyOf } from "./audiences.js"
import type { FunnelReach, PairReach } from "./funnel.js"

/**
 * Which of a deployment's pages loses the most readers between an ask and its
 * answer.
 *
 * A deployment can already ask where its readers stop reading, and the pages
 * come back in one order with the worst of them named
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
 * It could not ask where its readers stop **converting**, and the two are not
 * the same question: a pricing band every reader reaches and nobody buys from
 * has no fall in it anywhere, so the order of falls says *nothing to do here*
 * about the half of a page that pays.
 *
 * This is that second order, over the funnel answers a deployment already has:
 * no payload field, no counter, no column, no byte on any wire and no figure a
 * funnel reading does not already publish.
 *
 * ## It ranks the loss between the two ends and never the loss before them
 *
 * A funnel answer holds two losses. Readers who never reached the first end are
 * `before`, and readers who reached it and did not finish are `between`
 * (0221, 0229). **Only the second is ranked here**, and that is the whole of
 * what keeps this order and the order of falls from being two spellings of one
 * list: a reader who never reached the ask stopped *reading*, which is where
 * the fall between two siblings already puts them, and a page whose readers
 * stop short of the pricing band would otherwise stand near the head of both
 * orders for one event.
 *
 * So the key is `reached − converted`, scaled to the door exactly as a fall is:
 * `lost ÷ (1 + inflation)` off that page's own door row, because the straddle
 * rate is each page's own and ranking the raw losses would rank partly by how
 * long readers stay (0219).
 *
 * ## One argument, because the funnel answer already carries the door
 *
 * The order of falls takes the door rows beside the readings, since a reading
 * of where reading stops holds no arrivals. A funnel answer holds both — it is
 * read against the exact number of readers the revision had — so this is one
 * call with one argument and there is no row set to match up wrongly.
 *
 * ## A page nobody asked anything of is not a page nobody answered
 *
 * Nine states keep a page out of the order and each is a different sentence.
 * Three are the door's (0229); one is the caller's window holding two forms and
 * naming neither (0300); one is a question nobody has reached; one is a count
 * that cannot be reconciled with the page views there were to hold it; one is
 * the page that leaks nobody; and **two are about the questions a deployment
 * wrote rather than about any measurement** — a revision with no funnel
 * question at all, and a revision all of whose questions name parts it no
 * longer has (0212). No reading before this one could report either of those
 * two, because no reading before this one was keyed by what a deployment asked.
 *
 * ## What is deliberately not published
 *
 * **No deployment-wide conversion rate.** The artefact is an order and not a
 * total: a rate over several pages would need a denominator across them, and
 * the readers of two pages are two populations whose funnel answers are added
 * across rollup windows and therefore generous (0147). Every reader figure here
 * is one page's own, on that page's own row.
 *
 * The one figure that is added is `arrivals`, addable for the reason every
 * other counter here is not: a page view began on exactly one revision of
 * exactly one tree, was counted once at the door, and is never recounted
 * (0219). The counts of questions add for the same kind of reason — a question
 * belongs to one revision of one page.
 *
 * Pure, linear in the readings times their pairs, and reaches no store, clock
 * or DOM.
 */

/** A reason a page's conversion loss is withheld rather than ranked. */
export type ConversionSilence =
  /**
   * The reading holds two forms of the page and named neither, so it read
   * neither population's answers.
   *
   * Checked before everything else, because it is the cause of the noughts
   * underneath it: two forms of a page share a tree and a revision (0263) and
   * are told apart by a column (0284), so a funnel answer handed both with
   * neither asked for reads no pair at all — which is indistinguishable from a
   * page nothing asks anything of, and would be published as one (0301).
   *
   * The remedy is the caller's and it is the only one here that is: split the
   * window by audience and read each form on its own.
   */
  | "unsplit"
  /**
   * There is no page-view row at the door for this revision, so its loss cannot
   * be put on the same scale as another page's.
   *
   * Not a page that was not measured. Every figure inside its funnel answer
   * stands; what is missing is the one number that makes two pages comparable.
   */
  | "unscaled"
  /**
   * The row is there and nothing in it says a page view ever began.
   *
   * Either nobody read this revision, or the senders are not marking their
   * openings — and the reading publishes both counts, so the diagnosis is a
   * subtraction a surface can make.
   */
  | "unopened"
  /** Readers arrived and no rollup has folded a window of their reading yet. */
  | "uncounted"
  /**
   * Every question this revision is asked names a part it no longer has.
   *
   * Removed by a change, renamed, or moved to another tree: the counts against
   * those ends cannot move again and the noughts they report are not reader
   * facts (0212). **The sentence a surface should print is not about readers at
   * all** — it is *re-point these questions* — which is why this is held apart
   * from a funnel nobody answered.
   *
   * Reported only where **every** question is stale. A revision with one sound
   * question and three stale ones is ranked on the sound one, with the three
   * counted on the row.
   */
  | "stale"
  /**
   * Nobody reached the start of any question this revision is asked.
   *
   * The questions name parts the page has and no reader has got to one of them
   * in this window. There is no conversion to lose rather than a conversion
   * everybody failed, and the two print as opposite sentences.
   */
  | "unanswered"
  /**
   * More readers reached its sharpest ask than have ever appeared on the page.
   *
   * No rollup produces this: a view that satisfied an end in a window is a view
   * that appeared in it. A funnel row older than the page-view column, or a
   * caller that concatenated two reads of the counters, does. The counts are
   * published and the scaled figure is withheld, because the scale is the part
   * that is not true.
   */
  | "inconsistent"

export const CONVERSION_SILENCES: readonly ConversionSilence[] =
  everyMemberOf<ConversionSilence>()([
    "unsplit",
    "unscaled",
    "unopened",
    "uncounted",
    "stale",
    "unanswered",
    "inconsistent",
  ])

/** Where one page stands in the order, or why it is not in it. */
export type ConversionStanding =
  /** In the order, by the readers it loses between the two ends of its sharpest ask. */
  | "ranked"
  /**
   * Every reader who reached one of its asks went on to answer it.
   *
   * The cheerful answer, and a thin window produces it as well: two readers who
   * both converted leak nobody either. The arrivals travel with the row, so the
   * two are told apart on the row rather than by this word.
   */
  | "unleaked"
  /**
   * Nothing asks this version of the page for anything.
   *
   * **Not a silence**, which is the distinction worth keeping: no figure is
   * being withheld, because no question was written. A deployment reading it is
   * being told that the page has no funnel to measure rather than that its
   * funnel could not be measured, and those are opposite instructions.
   */
  | "unasked"
  | ConversionSilence

export const CONVERSION_STANDINGS: readonly ConversionStanding[] =
  everyMemberOf<ConversionStanding>()([
    "ranked",
    "unleaked",
    "unasked",
    "unsplit",
    "unscaled",
    "unopened",
    "uncounted",
    "stale",
    "unanswered",
    "inconsistent",
  ])

/** One line per standing, for a surface naming why a page is where it is. */
export const describeConversionStanding = (standing: ConversionStanding): string => {
  switch (standing) {
    case "ranked":
      return "in the order, by the readers it loses between an ask and its answer"
    case "unleaked":
      return "every reader who reached one of its asks went on to answer it"
    case "unasked":
      return "nothing asks this version of the page for anything"
    case "unsplit":
      return "one window holds two forms of the page and says which readers neither"
    case "unscaled":
      return "no page views counted at the door, so its loss is not comparable with another page's"
    case "unopened":
      return "the page-view row is there and nothing has said a page view began"
    case "uncounted":
      return "readers arrived and no rollup has folded a window of their reading yet"
    case "stale":
      return "every question it is asked names a part this version of the page no longer has"
    case "unanswered":
      return "nobody reached the start of any question it is asked"
    case "inconsistent":
      return "more readers reached its sharpest ask than have ever appeared"
  }
}

/** One revision of one page, as the order of conversions has it. */
export type LeakingPage = {
  readonly treeId: TreeId
  readonly revision: number
  /**
   * The audience this row is about, or `null` where the reading named none.
   *
   * Two forms of one page stand here as two rows, as they do in the order of
   * falls (0250): both are live, both are asked the same question, and the two
   * answers are of two populations. Nothing is summed across them.
   */
  readonly audienceId: AudienceId | null
  readonly standing: ConversionStanding
  /** Page views counted at the door, exact, or `null` where this revision has no row. */
  readonly opened: number | null
  /** This page's own straddle rate, which is what scales its loss. */
  readonly inflation: number | null
  /** How many questions this revision is asked, as the reading read them. */
  readonly questions: number
  /** Of those, how many name a part this revision no longer has. */
  readonly stalePairs: number
  /**
   * The ask that loses the most readers between its two ends, carried whole and
   * unchanged.
   *
   * `null` where no question of this revision could be ranked — which is every
   * standing but `ranked`, `unleaked` and `inconsistent`.
   */
  readonly at: PairReach | null
  /** Readers lost between that ask's two ends, as the window's counters have it. */
  readonly lost: number | null
  /**
   * The same loss on the door's scale, which is the key the order is on.
   *
   * Not a count of people and not rounded into one. Withheld where the page has
   * no rankable question, or no row to scale one by.
   */
  readonly readers: number | null
  /**
   * Of the readers who reached that ask, the share that answered it, carried
   * through from the pair unchanged.
   *
   * Sound without any correction, because both of its counts come off the same
   * row — so it is published even for a page whose scaled figure is withheld as
   * inconsistent.
   */
  readonly rate: number | null
}

/** A deployment's pages, in the order their conversions should be looked at. */
export type DeploymentConversion = {
  /**
   * Every page with a leak and a scale for it, worst first.
   *
   * Most readers lost at the door's scale, then the worse rate, then by tree id
   * and newest revision first — so two pages that leak the same do not reorder
   * on a refresh.
   */
  readonly ranked: readonly LeakingPage[]
  /** Every other page, by tree id and newest revision first. */
  readonly unranked: readonly LeakingPage[]
  /** The head of the order, which is the funnel to look at first. */
  readonly worst: LeakingPage | null
  /** How many pages stand in each state, over the ranked and the unranked alike. */
  readonly standings: Readonly<Record<ConversionStanding, number>>
  /**
   * Distinct trees across every page read, which is not the number of pages.
   *
   * Two revisions of one tree are two live versions of one page and both stand
   * in the order, as they do in the order of falls (0250).
   */
  readonly trees: number
  /**
   * Page views counted at the door across the pages handed in, added.
   *
   * Exact and addable, for the reason no other figure here is: a page view
   * began on one revision of one tree and was counted once (0219). It is a
   * weight rather than a deployment total — this sees the pages its caller
   * read, not the deployment's.
   */
  readonly arrivals: number
  /**
   * Funnel questions across the pages handed in, added.
   *
   * A question belongs to one revision of one page in one form, so two pages'
   * questions are two questions even where both name the same two ends: the
   * same ask of two pages has two answers.
   */
  readonly questions: number
  /** Of those, how many name a part the revision asking them no longer has. */
  readonly stalePairs: number
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * in an order is the one way an order can lie about how much there is to fix
   * (0158).
   */
  readonly duplicated: number
}

const EMPTY_STANDINGS: Readonly<Record<ConversionStanding, number>> = Object.freeze(
  Object.fromEntries(CONVERSION_STANDINGS.map((standing) => [standing, 0])) as Record<
    ConversionStanding,
    number
  >
)

const lostIn = (pair: PairReach): number => pair.reached - pair.converted

/**
 * The ask that loses the most readers between its two ends.
 *
 * Over the questions this revision still has, because a question naming a part
 * the page no longer has reports counts that cannot move and noughts that are
 * not reader facts (0212) — so a stale question with a large count would take
 * the head of a page's own order away from a sound one.
 *
 * Ties go to the pair the reading published first, which is a stable order of
 * the two ends rather than an arrival order.
 */
const sharpestIn = (pairs: readonly PairReach[]): PairReach | null =>
  pairs
    .filter((pair) => !pair.stale)
    .reduce<PairReach | null>(
      (worst, pair) => (worst === null || lostIn(pair) > lostIn(worst) ? pair : worst),
      null
    )

const silenceOfDoor = (reach: FunnelReach): ConversionSilence | null => {
  switch (reach.silence) {
    case "unmeasured":
      return "unscaled"
    case "unopened":
      return "unopened"
    case "uncounted":
      return "uncounted"
    case null:
      return null
  }
}

/**
 * One page's row, with the states tried in the order they have to be tried in.
 *
 * The unsplit window first, because it is the cause of the empty pair list
 * underneath it. The door's three next, because a page with no scale has
 * nothing to put a leak on. Then what was asked, because a question that does
 * not exist cannot be answered. Then whether anybody reached an ask, then
 * whether anybody was lost at one — and the disagreement last, because it is a
 * statement about a count and a row together.
 */
const rowOf = (reach: FunnelReach): LeakingPage => {
  const where = {
    treeId: reach.treeId,
    revision: reach.revision,
    audienceId: reach.audienceId,
    opened: reach.silence === "unmeasured" ? null : reach.opened,
    inflation: reach.inflation,
    questions: reach.pairs.length,
    stalePairs: reach.stalePairs,
  }
  const nothing = { at: null, lost: null, readers: null, rate: null }

  if (audienceScopeRead(reach).reading === "mixed") {
    return { ...where, ...nothing, standing: "unsplit" }
  }

  const door = silenceOfDoor(reach)

  if (door !== null) return { ...where, ...nothing, standing: door }

  if (reach.pairs.length === 0) return { ...where, ...nothing, standing: "unasked" }

  const at = sharpestIn(reach.pairs)

  if (at === null) return { ...where, ...nothing, standing: "stale" }
  if (at.reached === 0) return { ...where, ...nothing, standing: "unanswered" }

  const lost = lostIn(at)
  const carried = { at, lost, rate: at.rate }

  if (lost === 0) return { ...where, ...carried, readers: null, standing: "unleaked" }

  /**
   * A reading whose counts cannot be reconciled with the page views there were
   * to hold them keeps its counts and loses its scale, which is the half of the
   * row that is not true. The door's three are already past, so the inflation
   * is a number here and the division below needs no guard of its own.
   */
  if (at.unreconciled || reach.inflation === null) {
    return { ...where, ...carried, readers: null, standing: "inconsistent" }
  }

  return {
    ...where,
    ...carried,
    readers: lost / (1 + reach.inflation),
    standing: "ranked",
  }
}

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * By readers lost before rate, for the reason a page ranks its own falls that
 * way (0221): two readers out of three who left an ask unanswered is a worse
 * rate and a smaller problem than four hundred out of a thousand.
 */
const worseOf = (one: LeakingPage, other: LeakingPage): number =>
  (other.readers ?? 0) - (one.readers ?? 0) ||
  (one.rate ?? 1) - (other.rate ?? 1) ||
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision

/** Tree id, then newest revision first, then form — the order the readings are published in. */
const byPage = (one: LeakingPage, other: LeakingPage): number =>
  one.treeId.localeCompare(other.treeId) ||
  other.revision - one.revision ||
  (one.audienceId ?? "").localeCompare(other.audienceId ?? "")

/**
 * A deployment's pages, in the order their funnels should be looked at.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const order = deploymentConversionOf(windowFunnelsOf(window, assembly).pages)
 * ```
 *
 * Takes the funnel answers rather than the counters, for the reason every
 * derived reading in this subsystem takes readings: each answer is separately
 * useful and separately drawn, and deriving one twice is how two screens come
 * to disagree about one page.
 */
export const deploymentConversionOf = (
  funnels: readonly FunnelReach[]
): DeploymentConversion => {
  const seen = new Set<string>()
  const read: LeakingPage[] = []
  let duplicated = 0

  for (const reach of funnels) {
    const key = readingKeyOf(reach)

    if (seen.has(key)) {
      duplicated += 1
      continue
    }

    seen.add(key)
    read.push(rowOf(reach))
  }

  const ranked = read.filter((row) => row.standing === "ranked").sort(worseOf)
  const standings = { ...EMPTY_STANDINGS }

  for (const row of read) standings[row.standing] += 1

  return {
    ranked,
    unranked: read.filter((row) => row.standing !== "ranked").sort(byPage),
    worst: ranked[0] ?? null,
    standings,
    trees: new Set(read.map((row) => row.treeId)).size,
    arrivals: read.reduce((sum, row) => sum + (row.opened ?? 0), 0),
    questions: read.reduce((sum, row) => sum + row.questions, 0),
    stalePairs: read.reduce((sum, row) => sum + row.stalePairs, 0),
    duplicated,
  }
}
