import type { NodeId, TreeId } from "@jam-overture/loom"
import {
  describeRankStanding,
  RANK_STANDINGS,
  type DeploymentReading,
  type RankedPage,
  type RankStanding,
} from "@jam-overture/loom/signals"

import { readersOutOf } from "./arrivals"
import { unnamed, type PageName } from "./page-name"
import type { PartName } from "./part-name"
import { fallReading, fallSentence, type FallLine } from "./stopping"
import type { PlainWord } from "./vocabulary"

/**
 * Which of your pages to open first.
 *
 * ## The question this screen could not ask about itself
 *
 * Every reading on `/portal/readers` is about **one** page: where its reading
 * stops, which parts nobody got to, whether the people who got somewhere had
 * time to read it, what they did once they were there. All five are good
 * answers to a question somebody has already asked, and the question they have
 * already asked is *tell me about this page* — which means every one of them
 * needs the reader to know which page to open before the screen is any use.
 *
 * So the list was alphabetical, and said so. `page-order.ts` wrote the reason
 * down in as many words:
 *
 * > *There is no rung to lead with there: a page's readers are not more or less
 * > urgent than another page's, and the honest answer to why is this one at the
 * > top is that it is called About.*
 *
 * That was true and it has stopped being true. `deploymentReadingOf` puts a
 * deployment's pages in one order, worst first, with the fall each one loses
 * its readers at — so the rung exists, it is the readers the page is losing,
 * and a screen leading with the page called About is now leading with the wrong
 * page on purpose.
 *
 * ## The two figures, and why only one of them is on the surface
 *
 * A fall's raw `lost` is a distinct-view count, which is generous by every
 * reader who straddled a roll-up window — and the straddle rate is each page's
 * own, so two pages' raw losses are not the same kind of number
 * ([0250](../../../../../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
 * `readers` is that loss put on the scale the door counts in, which is what
 * makes the order an order.
 *
 * Both are true and they are different numbers, so **the surface prints one of
 * them and the record holds both.** `readers` goes on the surface, because it is
 * the figure the order is on and because the door's own exact count of arrivals
 * is in the same units — *about 340 of the 1,200 readers who arrived* is a
 * sentence whose two halves agree, and it is the only place in this subsystem
 * where it can be said at all. `lost` is one click down, beside the straddle
 * rate that separates them, so a reader checking the portal against the
 * counters finds the counters' own figure rather than a number they cannot
 * reproduce.
 *
 * The pair three lines apart in different units is the failure to avoid here,
 * and this lane has shipped a version of it twice: a share of one part of a
 * page multiplied by the whole page's readers (8 October), and a reach figure
 * drawn beside a floor as though both counted people (7 October).
 *
 * ## The pages that are not in the order
 *
 * A page can be perfectly well measured and have no place in the order — its
 * door row is missing, expired, or predates the column — and 0250 reports it out
 * of the order rather than at a guessed height. That is a **diagnosis and never
 * a second league table**: ranking the unscalable pages among themselves by
 * share is the ranking the record refused, for the reason 0221 refused it inside
 * one page.
 *
 * So they are a count and a reason here, and the pages themselves are still in
 * the list below with every figure they ever had. Nothing is removed; what is
 * withheld is a position in an order that would be wrong.
 *
 * ## What it never does
 *
 * **It never adds a loss to a loss.** There is no deployment-wide figure for
 * readers lost and 0250 says there will not be one. One reader who got past two
 * falls is in both of their counts, and a page with two live versions is two
 * rows on purpose — so the one total here is `arrivals`, which is addable for
 * the one reason nothing else is: a reader arrived at one version of one page
 * and was counted once at the door.
 *
 * **It takes nothing.** An order is an argument for a person to open a page
 * with, never a change — the shape 0031 settled for calibration and this screen
 * has held since it was built.
 */

/** One page in the order, or out of it, as the screen reads it. */
export type PageToFix = {
  readonly treeId: TreeId
  readonly revision: number
  readonly page: PageName
  readonly standing: RankStanding
  /**
   * Where it loses most of them, named from the page itself.
   *
   * Absent where the page has no fall to name, and absent where the fall's two
   * parts are not in the names handed over — which is a naming miss costing a
   * sentence rather than a row, exactly as every other listing in this portal
   * handles one.
   */
  readonly fall: FallLine | undefined
  /**
   * The loss on the door's scale: the figure the order is on and the one on the
   * surface.
   *
   * Not a count of people and deliberately not rounded into one by the runtime.
   * {@link whoItLoses} is the one place it is rounded, with *about* in front of
   * it.
   */
  readonly readers: number | null
  /** Readers counted at the door, exact. The denominator the pair needs. */
  readonly opened: number | null
  /**
   * The counters' own figure for the same fall.
   *
   * **Never on the surface beside {@link PageToFix.readers}.** It is the record
   * behind the disclosure, where the straddle rate that separates the two is
   * printed with it.
   */
  readonly lost: number | null
  /** The fall as a share of the readers who reached the part above it. */
  readonly share: number | null
  /** That page's own straddle rate, for the record. */
  readonly inflation: number | null
  /** The runtime's own line for why this page stands where it does. */
  readonly onTheRecord: string
}

/** A deployment's pages, in the order to open them. */
export type FixFirst = {
  /** In the order, worst first. */
  readonly ranked: readonly PageToFix[]
  /** Out of the order, by name. A diagnosis and never a second league table. */
  readonly unranked: readonly PageToFix[]
  /** The page to open first, where there is one. */
  readonly worst: PageToFix | undefined
  readonly standings: Readonly<Record<RankStanding, number>>
  /** Readers counted at the door across every page in this reading, added. */
  readonly arrivals: number
  /**
   * Pages the counters mention that are not in this reading at all.
   *
   * The version gap, and it is this screen's limit rather than the reading's.
   * A fall is a comparison between two parts of a page, so a page has to be
   * joined to the version its counters were filed against — and only one
   * version of a page can be read from the store. A page whose counted window
   * has not caught up with a change that has just landed is therefore absent
   * from the order for as long as an hour, and the section says so rather than
   * leaving a reader to wonder which pages these are.
   */
  readonly unjoined: number
}

/**
 * What each standing is, in words — and the runtime's own name for it beside.
 *
 * `ranked` is in the table and is never drawn: a page in the order is described
 * by where it is, and a badge reading *in the order* on every row of an order
 * is a label for the reader's benefit that tells them nothing. It is here so
 * that the table is total over `RANK_STANDINGS` and a seventh standing cannot
 * arrive without this file failing to compile.
 */
export const RANK_STANDINGS_PLAIN: Readonly<Record<RankStanding, PlainWord>> = {
  ranked: {
    label: "in the order",
    meaning: "This page loses readers somewhere, and the loss can be compared with another page’s.",
    technical: "ranked",
  },
  unbroken: {
    label: "losing nobody",
    meaning:
      "Everybody who got to a part of this page got to the part after it. There is nothing here to fix.",
    technical: "unbroken",
  },
  unread: {
    label: "nothing counted yet",
    meaning:
      "No reader has been reported on this version of the page, so there is nothing yet to be worse or better than.",
    technical: "unread",
  },
  unscaled: {
    /**
     * The one standing a person is likeliest to misread as a fault in their
     * page, and it is not one: the page's own figures are as good as any
     * other's. What is missing is the one number that makes two pages
     * comparable, so the label is about the comparison rather than about the
     * page.
     */
    label: "not comparable yet",
    meaning:
      "Nothing counted how many readers arrived at this page, so what it loses cannot be put on the same scale as another page’s. Every figure on the page itself still stands.",
    technical: "unscaled",
  },
  unopened: {
    label: "nobody marked as arriving",
    meaning:
      "The count of arrivals is there and nothing has said a reader ever arrived, so there is no weight to put behind what the page loses.",
    technical: "unopened",
  },
  inconsistent: {
    label: "the numbers disagree",
    meaning:
      "This page reports losing more readers at one place than have ever arrived at it, which no reading produces. Something other than a published page is reporting in.",
    technical: "inconsistent",
  },
}

/** `1 page` and never `1 pages`, which is the first thing a reader distrusts. */
export const pagesCount = (count: number): string => (count === 1 ? "1 page" : `${count} pages`)

/**
 * The reading, from the runtime's order and the names the pages give
 * themselves.
 *
 * Handed the names rather than the pages, which is what `stopping.ts` and
 * `skipped.ts` do and for the same reason: the join to the page happens once on
 * the screen, and a second join is how two sections of one screen come to
 * disagree about which window they are describing.
 */
export const fixFirstOf = (
  reading: DeploymentReading,
  pages: ReadonlyMap<string, PageName>,
  parts: ReadonlyMap<string, PartName>,
  unjoined: number
): FixFirst => {
  const row = (page: RankedPage): PageToFix => ({
    treeId: page.treeId,
    revision: page.revision,
    /*
     * A page whose own read did not come back is named by its identifier, which
     * is the rule `page-name.ts` states for every listing in this portal: a
     * naming miss costs a name and never a row.
     */
    page: pages.get(page.treeId) ?? unnamed(page.treeId),
    standing: page.standing,
    fall: fallOf(page, parts),
    readers: page.readers,
    opened: page.opened,
    lost: page.lost,
    share: page.share,
    inflation: page.inflation,
    onTheRecord: describeRankStanding(page.standing),
  })

  const ranked = reading.ranked.map(row)

  return {
    ranked,
    unranked: reading.unranked.map(row),
    /*
     * Taken off the mapped order rather than off `reading.worst`, so the page
     * the section leads with is the same object as the first row of the list —
     * two mappings of one row is two chances to name one page two things.
     */
    worst: ranked[0],
    standings: reading.standings,
    arrivals: reading.arrivals,
    unjoined,
  }
}

/**
 * The fall, named — and the one place a name is allowed to be missing.
 *
 * The runtime's fall carries two identifiers and nothing else, because a
 * `ReadingStop` is about a pair of parts and not about what they say. So the
 * names come from the page, and a part that has since been removed from it has
 * none: the sentence is withheld rather than printed with an identifier in the
 * middle of it, which is the one thing `fallReading` must never produce for a
 * reader who has not asked for the record.
 */
const fallOf = (
  page: RankedPage,
  parts: ReadonlyMap<string, PartName>
): FallLine | undefined => {
  const at = page.at

  if (at === null) return undefined

  const after = named(at.after, parts)
  const before = named(at.before, parts)

  if (after === undefined || before === undefined) return undefined

  return fallSentence({ share: at.share, after: { name: after }, before: { name: before } })
}

/**
 * A part's name, or nothing.
 *
 * Deliberately **not** falling back to the noun in the registered type, which is
 * what `stopping.ts` does. There the fallback cannot fire — every part of a run
 * is an element of the page that was just joined — and a type is to hand. Here
 * the names are the whole deployment's and a fall's part may belong to a page
 * whose read failed, so there is no type to read a noun off and the honest
 * answer is that this sentence cannot be written.
 */
const named = (nodeId: NodeId, parts: ReadonlyMap<string, PartName>): PartName | undefined =>
  parts.get(nodeId)

/**
 * The one sentence above the section, and the whole of what this reading is for.
 *
 * Four answers, and the three that are not an order are each a different fact
 * said out loud rather than an empty section — the distinction this lane has
 * drawn since `StateNotice` gained a tone for a good result. *No page is losing
 * anybody*, *nothing can be compared yet* and *nothing has been counted* render
 * identically as silence and are three entirely different pieces of news, and
 * only one of them is about anybody's pages.
 */
export const fixFirstSummary = (fix: FixFirst): string => {
  if (fix.ranked.length > 0)
    return fix.ranked.length === 1
      ? "One of your pages is losing readers partway through, and it is at the top of this list."
      : `${pagesCount(fix.ranked.length)} are losing readers partway through. They are at the top of this list, worst first.`

  if (fix.standings.unbroken > 0)
    return "No page here is losing readers partway through: everybody who got to a part of a page got to the part after it."

  if (fix.standings.unscaled > 0 || fix.standings.unopened > 0)
    return "Nothing has counted how many readers arrived at these pages, so there is no way yet to say which of them loses the most. Each page’s own figures are below and they all stand."

  return "There is nothing to put in an order yet. Nothing has been reported about the versions of these pages that the counters hold."
}

/**
 * Who the worst page loses, in people, with the weight behind it.
 *
 * *About 340 of the 1,200 readers who arrived* — the loss on the door's scale
 * against the door's own exact count. It is sayable here and nowhere else in
 * this subsystem: every other figure on this screen divides by the largest
 * visit count any one row of a window reports, which is a floor rather than a
 * count of people.
 *
 * `undefined` rather than a guess wherever either half is missing, which leaves
 * the share — sound without any correction — as the sentence the row still has.
 */
export const whoItLoses = (page: PageToFix): string | undefined =>
  page.readers === null || page.opened === null
    ? undefined
    : `${readersOutOf(page.readers, { arrived: page.opened })} who arrived`

/**
 * How many pages are out of the order, and that their own figures are untouched.
 *
 * One line, and it is the whole of what the unranked pages get on the surface.
 * The reasons are a list behind the disclosure, because a reader who has not
 * asked *why* does not need four of them.
 */
export const outOfTheOrder = (fix: FixFirst): string | undefined => {
  const out = fix.unranked.length

  if (out === 0) return undefined

  const total = fix.ranked.length + out

  /*
   * Two phrasings and the count chooses, because `pagesCount` carries the noun
   * and the **verb** is the half it cannot: *1 page of these 2 are not in the
   * order* passed every assertion about the number and was the first thing a
   * reader would distrust. The rendered test is what found it, which is the
   * argument for having one.
   */
  return out === 1
    ? `1 of these ${total} pages is not in the order. Nothing is wrong with it and nothing about it is hidden — what it loses cannot be put on the same scale as another page’s, so it is listed without a place in the order.`
    : `${out} of these ${total} pages are not in the order. Nothing is wrong with them and nothing about them is hidden — what they lose cannot be put on the same scale as another page’s, so they are listed without a place in it.`
}

/**
 * The version gap, said out loud.
 *
 * A page whose counters have not caught up with a change that has just landed
 * cannot be in the order at all, because a fall is a comparison between two
 * parts of a page and the page has to be the version its counters were filed
 * against. It clears itself within one collection window and there is nothing
 * for anybody to do about it, which is the half a notice has to carry or it
 * sends somebody looking for a fault.
 */
export const notYetInTheOrder = (fix: FixFirst): string | undefined => {
  if (fix.unjoined === 0) return undefined

  /* Two phrasings, for `outOfTheOrder`'s reason: the verb is the half a count word cannot carry. */
  return fix.unjoined === 1
    ? "1 page is not in this order yet, because what was counted for it is not the version being served. That clears itself once a collection window has passed — there is nothing to do about it, and the page’s card below says which version its figures are from."
    : `${fix.unjoined} pages are not in this order yet, because what was counted for them is not the version being served. That clears itself once a collection window has passed — there is nothing to do about it, and each page’s card below says which version its figures are from.`
}

/**
 * Why one row per page, which is the question the order invites and the one it
 * does not answer here.
 *
 * `deploymentReadingOf` holds two live versions of one page as two rows, on
 * purpose: a version shipped an hour ago with four readers on it does not
 * supersede the one nine thousand read. **This screen hands it one row per
 * page**, at the newest version its counters have finished, because that is the
 * only version it can join to the page — so the order's own ability to carry
 * both is a property of the reading and not of this screen, and saying *two
 * versions of a page are two rows* on a surface that never shows two would be
 * the portal describing a reading rather than a deployment.
 */
export const ONE_PER_PAGE =
  "Each page is in this order once, at the newest version its counters have finished. Which version each figure came from is on that page’s own card below."

/** The whole fall sentence, as a reader meets it. Assert this, not the pieces. */
export const fallOnRow = (page: PageToFix): string | undefined =>
  page.fall === undefined ? undefined : fallReading(page.fall)

/**
 * Where a page sits in this screen's list, for `inPageOrder`.
 *
 * The position in the ranked order, then the unranked after all of it. A rank
 * rather than a comparator, for the reason `page-order.ts` gives: a comparator
 * is a thing a screen can get subtly wrong in a way no test catches, and a rank
 * is readable in a test failure.
 *
 * **Not the scaled loss, negated.** That is the obvious implementation and it
 * reorders two pages losing the same on a refresh, because the fallback would
 * be the shared tiebreak rather than the order's own three-key one. The order
 * has already been decided by the runtime; this reads the position out of it.
 */
export const fixFirstRanks = (fix: FixFirst): ReadonlyMap<string, number> => {
  const ranks = new Map<string, number>()

  fix.ranked.forEach((page, at) => ranks.set(page.treeId, at))

  /*
   * One rung for every unranked page rather than a position each: they are a
   * set this screen refuses to order, so the shared tiebreak arranges them and
   * `ListOrder` says that it does.
   */
  for (const page of fix.unranked) ranks.set(page.treeId, fix.ranked.length)

  return ranks
}

/**
 * The rank for a page the reading never saw, which is below every page it did.
 *
 * A page absent from the order because of the version gap is not a page with
 * nothing wrong with it; it is a page nothing can be said about yet, and the
 * sentence above the list says so. Sorting it among the ranked pages would put
 * it at a height nothing supports.
 */
export const NOT_IN_THE_ORDER = Number.MAX_SAFE_INTEGER

/** Every standing with at least one page in it, in the table's own order. */
export const standingsHeld = (fix: FixFirst): readonly RankStanding[] =>
  RANK_STANDINGS.filter((standing) => fix.standings[standing] > 0)
