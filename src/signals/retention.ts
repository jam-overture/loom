import type { ExpiryOutcome } from "./expire.js"
import type { DeliveryRetention } from "./notice.js"

/**
 * Whether the deployment keeps the retention ceiling it publishes to its
 * readers.
 *
 * A notice tells the reader three things about a delivery's life: the age it is
 * counted at and the age it is deleted at, which are this deployment's own
 * numbers, and how often its sweep runs, which is a claim about a cron nobody
 * here can see (0320, 0351). They make a ceiling — *gone within 31 days of
 * arriving* — and a deployment that states a day and sweeps monthly publishes
 * that sentence to every reader of its privacy page with nothing behind it.
 *
 * **The evidence is already in the sweep's own hands.** A run scans the table
 * from its oldest end, so the age of the oldest delivery still there is a
 * number every run has and none of them reported. If that age is past the
 * ceiling, then a delivery existed that readers were told was gone — and it
 * existed for however long the gap is, whatever this run then deletes.
 *
 * So the check costs no read, no column, no byte on any wire and nothing in a
 * browser: it is a subtraction over what a sweep already looked at.
 *
 * **It is the expiry run's evidence, not the fold's** (0351). Until 5 November
 * the fold was the deletion, so the run that counted a window was also the run
 * whose scan proved when deliveries went; now counting and deleting are two
 * operations with two windows, and the published ceiling is about the second.
 * Handing this the fold's outcome would judge a promise about deletion against
 * a figure that measures how far behind counting is — which on a healthy
 * deployment is minutes, so the check would read *kept* while a broken expiry
 * cron kept everything for ever.
 *
 * ## It is beside the notice and never inside it
 *
 * `collectionNoticeOf` is a pure function of a deployment's configuration and
 * has to stay one (0313): a privacy page with a store and a clock behind it is
 * a page that cannot render while the database is down, which is worse for a
 * reader than a stated ceiling. The judgement therefore lives here, where a
 * store and a clock are already in the room, and it is handed the same
 * retention the notice publishes rather than a second derivation of it — a
 * sweep that computed its own ceiling could clear a promise nobody made.
 *
 * ## What it refuses to judge
 *
 * Three of the five states answer *nothing is wrong* without asserting that
 * anything is right, and each is a refusal rather than a gap: a deployment that
 * stated no interval published no ceiling, a run that never reached the buffer
 * saw no delivery, and a run that found nothing ripe has proved the promise
 * holds without needing a figure at all.
 *
 * Pure, constant-time, and reaches no store, clock or DOM.
 */

/** How a published retention ceiling stood at the moment of one sweep. */
export type RetentionPromise =
  /**
   * The deployment stated no sweep interval, so its notice publishes no
   * ceiling.
   *
   * There is nothing for a run to keep or break. The remedy is not a sweep's:
   * an operator states the interval their cron actually runs on, and until they
   * do their readers are told when a delivery ripens and nothing about when it
   * goes.
   */
  | { readonly state: "unpromised" }
  /**
   * The run read no delivery, so nothing here says how old the oldest one is.
   *
   * Either it never reached the table — refused on its window, or the store was
   * unavailable — or the one instant it needed could not be read. A table the
   * sweep cannot see is a promise nothing can speak for, and the honest answer
   * is silence rather than *kept*.
   */
  | { readonly state: "unread" }
  /**
   * Nothing in the table is old enough to delete, so nothing in it can be past
   * the ceiling.
   *
   * The strongest of the three quiet answers and the only one that is a proof.
   * A scan runs from the oldest end, so a run that found nothing expirable
   * found every delivery younger than the kept window — and the ceiling is that
   * window plus a sweep, which is longer. An empty table lands here too, for
   * the same reason and with nothing waiting.
   */
  | { readonly state: "unripe" }
  /**
   * The oldest delivery in the buffer is within the ceiling the notice
   * publishes.
   *
   * Both figures travel, because the sentence an operator wants is the
   * comparison and not the verdict: *the oldest here is twelve minutes old and
   * your readers are told seventy*.
   */
  | {
      readonly state: "kept"
      /** How old the oldest delivery still in the table was, in milliseconds. */
      readonly oldestMs: number
      /** The ceiling the notice publishes: the later of the two windows plus one sweep. */
      readonly goneWithinMs: number
    }
  /**
   * A delivery is older than the ceiling the notice publishes, so that sentence
   * is false and was false for `byMs` before this run.
   *
   * The deployment is either sweeping less often than it stated or not sweeping
   * at all, and the two are the same fault from here. Raising the stated
   * interval makes the published promise true and weaker; sweeping on the
   * interval already stated makes it true and keeps it — and that choice is an
   * operator's, so this names the gap rather than a remedy.
   */
  | {
      readonly state: "broken"
      readonly oldestMs: number
      readonly goneWithinMs: number
      /** How far past the ceiling the oldest delivery is. */
      readonly byMs: number
      /**
       * Whether what is holding the oldest delivery is that no fold has counted
       * it (`expire.ts`).
       *
       * The gap is real either way and this does not soften it — a delivery
       * readers were told was gone is still there. What it does is name the
       * remedy, which in this one case is not the expiry sweep's: nothing may
       * delete an uncounted delivery, so a deployment whose collection has
       * stopped breaks its retention promise by not counting, and running the
       * deletion more often would change nothing.
       */
      readonly uncounted: boolean
    }

/**
 * Judge one expiry sweep's own evidence against the ceiling its deployment
 * publishes.
 *
 * The retention is taken whole — the same `Pick` of the notice the reader's
 * sentence is built from (0320) — so the ceiling judged here is the ceiling
 * published, by construction rather than by a reviewer.
 *
 * **An unstated interval wins over everything else**, including a buffer months
 * behind. It is not that the buffer is fine; it is that no ceiling was
 * published, so a run has no claim of its deployment's to measure. The operator
 * hears about an unstated schedule from the setting, which is where the remedy
 * is.
 *
 * **A delivery received in the future is kept, by the same subtraction rather
 * than by a special case** — a negative age is never longer than a positive
 * ceiling, which is how the stall check answers a clock that disagrees with
 * itself (0274).
 */
export const retentionPromiseOf = (
  outcome: ExpiryOutcome,
  retention: DeliveryRetention
): RetentionPromise => {
  if (retention.sweep.state !== "stated") return { state: "unpromised" }

  const { goneWithinMs } = retention.sweep

  if (outcome.outcome === "refused" || outcome.outcome === "unavailable") {
    return { state: "unread" }
  }

  /**
   * A run that deleted nothing and read nothing saw no delivery at all, which
   * is an empty table rather than a proof about one. Both answer *nothing here
   * can be past the ceiling*, so the one with no figure is `unripe` beside the
   * one whose figure is young — the distinction a reading of this would draw
   * between them is one neither of them supports.
   */
  const { oldestMs } = outcome
  if (oldestMs === null) return { state: "unripe" }
  if (!Number.isFinite(oldestMs)) return { state: "unread" }

  return oldestMs > goneWithinMs
    ? {
        state: "broken",
        oldestMs,
        goneWithinMs,
        byMs: oldestMs - goneWithinMs,
        uncounted: outcome.stopped === "uncounted",
      }
    : { state: "kept", oldestMs, goneWithinMs }
}

/**
 * One line for the operator who runs the sweep, because they are the only
 * person who can close the gap.
 *
 * Milliseconds, as the settings an operator typed are in: a line that rounded
 * to minutes would not tell somebody who wrote an interval in the wrong units
 * which units it wanted.
 */
export const describeRetentionPromise = (promise: RetentionPromise): string => {
  switch (promise.state) {
    case "unpromised":
      return "readers are promised no ceiling on how long a delivery lives, so there is none for this run to keep"
    case "unread":
      return "no delivery was read, so nothing here says whether the ceiling readers are promised is being kept"
    case "unripe":
      return "nothing kept is old enough to delete, so no delivery is past the ceiling readers are promised"
    case "kept":
      return `the oldest delivery kept is ${promise.oldestMs}ms old, and readers are promised one is gone within ${promise.goneWithinMs}ms of arriving`
    case "broken":
      return (
        `the oldest delivery kept is ${promise.oldestMs}ms old and readers are promised one is gone within ${promise.goneWithinMs}ms of arriving, ` +
        `so that promise has been false for ${promise.byMs}ms: ` +
        (promise.uncounted
          ? "no fold has counted it, so nothing may delete it and the remedy is to run collection"
          : "this deployment is sweeping less often than it stated, or not at all")
      )
  }
}
