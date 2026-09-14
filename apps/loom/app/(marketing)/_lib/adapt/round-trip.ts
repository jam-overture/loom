import type { LoomTree } from "@loom/runtime"

import { piecesIn } from "../measure"
import { ASKS, type Ask, type AskId } from "./asks"
import type { ChangeRecord } from "./record"
import { runAsk } from "./run"
import { runUndo } from "./undo"

/**
 * A change, and then the change that reverses it, run end to end.
 *
 * The site has had the claim in its panel since August — *putting it back
 * restores every word rather than writing them out again* — and the only place
 * it was ever checked was a test file. That is the wrong place for it. It is the
 * fourth quarter of the one thing this project's recorded positioning says is
 * the difference: what changed, who asked, which rule allowed it, **and how to
 * put it back.** Three of the four have a page each.
 *
 * So this runs it, while the page is being built: every request the front door
 * offers that changes anything, applied, and then put back, against the page
 * this site publishes at `/`. Nothing below is typed — the counts, the weights,
 * the verdicts and the sentence saying whether the page came back are all read
 * off what the sequence returned.
 *
 * **Both halves are approved where the rules stop and ask.** The subject here is
 * what putting something back is like, and a change that never landed has
 * nothing to put back — so a hold is answered rather than reported, and the
 * record says so on the page in both directions. What a visitor cannot do is
 * answer a refusal, and the one refused request has no round trip at all.
 */

export type RoundTrip = {
  readonly ask: AskId
  /** What a person would have said, verbatim — the front door's own button. */
  readonly asked: string
  /** The words on the button, for a column heading that has no room for the rest. */
  readonly label: string
  /** The change, exactly as the front door's own panel reports it. */
  readonly change: ChangeRecord
  /** Putting it back, reported the same way, because it is a change like any other. */
  readonly back: ChangeRecord
  /** Pieces on the page when the visitor arrived. */
  readonly arrived: number
  /** Pieces on it after the change. */
  readonly changed: number
  /** Pieces on it after putting the change back. */
  readonly restored: number
  /**
   * Whether the page afterwards is the page that arrived, piece for piece and
   * name for name.
   *
   * Compared as the whole page written out rather than as a count, because a
   * count is satisfied by ten pieces coming back in the wrong order, under a
   * different heading, or with a setting changed on the way. This is not.
   *
   * **What it deliberately does not claim is that a rebuild would look
   * different.** This site's page builders are deterministic — `pages.test.ts`
   * holds every route to building the same page twice, byte for byte — so
   * rebuilding the front door produces the same names and this comparison could
   * not tell that apart from a restore. On a host with a store it would; here it
   * would not, and the page says the thing that is measured rather than the
   * thing that sounds strongest.
   */
  readonly identical: boolean
}

/**
 * The page, written out, ignoring the revision counter the change moved.
 *
 * Every piece's name, position, settings and words are in here, which is what
 * makes it the strongest check available rather than the cheapest one.
 */
const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

/**
 * Whether one page is the other, piece for piece and name for name.
 *
 * Exported so the comparison itself is asserted rather than only its answer. On
 * this site every round trip comes back, so a comparison that always said *yes*
 * would agree with every run the page prints and nothing would ever notice — and
 * `round-trip.test.ts` puts pages through this that are genuinely different,
 * which is the one way to tell a measurement from a constant.
 */
export const cameBack = (before: LoomTree, after: LoomTree): boolean =>
  shapeOf(after) === shapeOf(before)

/**
 * Whether the rules stopped and asked before this one went through.
 *
 * Read off the verdict rather than tracked separately: `approved` is what the
 * record carries when the rules held a change *and* a person then allowed it,
 * which is exactly the question — a landed change was never put to anybody.
 */
export const askedFirst = (record: ChangeRecord): boolean => record.verdict === "approved"

/**
 * One request, applied and then put back, against the page as published.
 *
 * `undefined` where there is no round trip to report: a refused request leaves
 * the page as it was and the sequence writes no change to reverse, so there is
 * nothing here to measure and the band says so in words instead of printing an
 * empty row.
 */
const roundTripOf = async (page: LoomTree, ask: Ask): Promise<RoundTrip | undefined> => {
  const change = await runAsk(page, ask, true)

  if (change.undo === undefined) return undefined

  const back = await runUndo(change.page, ask, change.undo, true)

  return {
    ask: ask.id,
    asked: ask.utterance,
    label: ask.label,
    change: change.record,
    back: back.record,
    arrived: piecesIn(page.root),
    changed: piecesIn(change.page.root),
    restored: piecesIn(back.page.root),
    identical: cameBack(page, back.page),
  }
}

/**
 * Every round trip the front door can be put through, in the order it offers
 * the buttons.
 *
 * **A trip that did not come back throws, and the page does not publish.** The
 * band's entire claim is that it did, and a landing page that printed *the page
 * came back as it was* under a row where it had not would be the single worst
 * thing this site could do — it is the one claim a reader is being asked to
 * trust rather than check. So it is checked here, where a failure is a red
 * build rather than a sentence nobody re-reads.
 */
export const roundTripsOn = async (page: LoomTree): Promise<readonly RoundTrip[]> => {
  const trips: RoundTrip[] = []

  for (const ask of ASKS) {
    const trip = await roundTripOf(page, ask)

    if (trip === undefined) continue

    if (!trip.identical || trip.restored !== trip.arrived) {
      throw new Error(
        `loom: putting "${ask.id}" back left the page at ${trip.restored} pieces against ${trip.arrived}, and this band says it does not`
      )
    }

    trips.push(trip)
  }

  if (trips.length === 0) {
    throw new Error("loom: no request on the front door changes anything, so nothing can be put back")
  }

  return trips
}

/**
 * The requests the front door offers that change nothing at all.
 *
 * Counted rather than named, and printed, because the band would otherwise be
 * quietly selective: five buttons go in and four rows come out, and a reader who
 * has been to the front door can count. The one missing is the refusal, which is
 * the site's best button — so the band says what happened to it rather than
 * leaving a reader to notice the gap.
 */
export const withoutARoundTrip = (trips: readonly RoundTrip[]): readonly Ask[] =>
  ASKS.filter((ask) => !trips.some((trip) => trip.ask === ask.id))

/**
 * The trips where putting it back was weighed differently from the change.
 *
 * The best measurement on the page and the one a reader does not expect. An undo
 * is not handed the verdict of the change it reverses — it is weighed on what
 * *it* does, so putting back an addition is a removal and carries a removal's
 * weight. A reader who assumed *undo is always safe* is reading the counter-case
 * off the site's own front door.
 */
export const weighedDifferently = (trips: readonly RoundTrip[]): readonly RoundTrip[] =>
  trips.filter((trip) => trip.change.weighed !== trip.back.weighed)

/** The trips where the rules stopped and asked before putting it back. */
export const askedAgain = (trips: readonly RoundTrip[]): readonly RoundTrip[] =>
  trips.filter((trip) => askedFirst(trip.back))
