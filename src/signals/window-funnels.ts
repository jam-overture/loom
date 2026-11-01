import { readingKeyOf } from "./audiences.js"
import { funnelReachOf, type FunnelReach } from "./funnel.js"
import type { PageReading } from "./parts.js"
import type { ReaderWindow, WindowAssembly } from "./window.js"

/**
 * The one reading of a window that the assembly cannot be asked for in one
 * call, published in one call.
 *
 * Assembling a window turns it into the three subjects every reading and
 * comparison takes — the readings, the before-and-afters, the two libraries —
 * and after it almost every reading is one call with one argument
 * ([0327](../../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)).
 * A funnel answer is the exception, and it is the exception twice over: it needs
 * the window's funnel rows and its door rows, which the assembly deliberately
 * does not republish, so both the per-page reading and the comparison of two
 * revisions were reachable only by a caller that already knew how to write the
 * composition.
 *
 * **It is not the hazard the second rung's three were.** A funnel answer
 * filters its rows to the revision, scopes them to the form and deduplicates
 * its own questions, so a caller writing the line gets the right answer — the
 * cost is that it is written once per reading and once per side of every
 * comparison, which is how one screen comes to hold two answers to one
 * question.
 *
 * ## What this adds beyond saving the line
 *
 * **Every side of every comparison is the same object as the reading of that
 * form.** The sides of a before-and-after are two of the readings the window
 * holds, so their answers are looked up rather than read a second time, and a
 * surface drawing the reading and the comparison together cannot show two
 * funnel answers of one revision. That is the same property the second rung
 * keeps between a region map and a readership (0327), one subject across.
 *
 * ## It composes and does not count
 *
 * Nothing here counts, divides, sums or withholds. Each answer carries its own
 * counts of what it ignored — rows of another revision, of another form, and
 * questions named twice — and a total over them would be a figure in no unit
 * (0327). A pair whose side is not among the readings is read rather than
 * dropped, so there is nothing to report a count of.
 *
 * Linear in the readings and their rows, being one funnel answer per reading
 * and one lookup per side of a pair.
 */

/** Two revisions of one form, as their funnels answered. */
export type FunnelPairing = {
  readonly was: FunnelReach
  readonly now: FunnelReach
}

/** A window's funnels, read against the pages and the arrivals the window holds. */
export type WindowFunnels = {
  /**
   * One answer per reading the window holds, in the readings' own order.
   *
   * Never two of one reading, because the readings are never two of one: the
   * key a window is split by is the key an answer is of (0290).
   */
  readonly pages: readonly FunnelReach[]
  /**
   * One before-and-after per form the window paired, in the pairs' own order.
   *
   * What a comparison of two windows' funnels takes (0288), which could not be
   * reached from a store before: the pairing exists and the answers it needs
   * did not.
   */
  readonly pairs: readonly FunnelPairing[]
}

/**
 * Read a window's funnels off the window and its assembly.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const funnels = windowFunnelsOf(window, assembly)
 *
 * const order = deploymentConversionOf(funnels.pages)
 * const moved = funnels.pairs.map(({ was, now }) => funnelChangeOf(was, now))
 * ```
 *
 * The window is handed in again rather than carried on the assembly, exactly as
 * the second rung takes it: the rows these answers are of are the ones the
 * assembly does not republish, and they are an argument the caller passed one
 * line above.
 *
 * The context is not needed and is not taken. A funnel answer is scoped by the
 * form its reading names and holds no region bucket, so neither of the two
 * context fields the other rungs need has anything to reach here.
 */
export const windowFunnelsOf = (
  window: ReaderWindow,
  assembly: WindowAssembly
): WindowFunnels => {
  const answerOf = (reading: PageReading): FunnelReach =>
    funnelReachOf(reading, window.funnels, window.pageViews)

  const pages = assembly.readings.pages.map(answerOf)

  const byReading = new Map<string, FunnelReach>(
    pages.map((answer) => [readingKeyOf(answer), answer])
  )

  /**
   * A side's answer, reused where the window holds that reading and read where
   * it does not.
   *
   * Reused for the property above: two answers of one revision on one screen is
   * the thing this exists to make impossible. Read rather than skipped for the
   * caller that assembled a pairing of its own — a side absent from the
   * readings is still a revision whose funnels can be answered, and dropping it
   * would publish *this form has no before-and-after* about a pair that has
   * one.
   */
  const sideOf = (reading: PageReading): FunnelReach =>
    byReading.get(readingKeyOf(reading)) ?? answerOf(reading)

  return {
    pages,
    pairs: assembly.pairs.pairs.map((pair) => ({
      was: sideOf(pair.was),
      now: sideOf(pair.now),
    })),
  }
}
