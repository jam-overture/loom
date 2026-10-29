import type { CollectionOutcome } from "./collect.js"
import type { DeliveryRetention } from "./notice.js"

/**
 * Whether the deployment keeps the retention ceiling it publishes to its
 * readers.
 *
 * A notice tells the reader two things about a delivery's life: the age it
 * ripens at, which is this framework's own number, and how often the deployment
 * sweeps the ripe ones away, which is a claim about a cron nobody here can see
 * (0320). The two add to a ceiling — *gone within 70 minutes of arriving* — and
 * a deployment that states ten minutes and sweeps weekly publishes that
 * sentence to every reader of its privacy page with nothing behind it.
 *
 * **The evidence is already in the sweep's own hands.** A run scans the buffer
 * from its oldest end, so the age of the oldest delivery still waiting is a
 * number every run has and none of them reported. If that age is past the
 * ceiling, then a delivery existed that readers were told was gone — and it
 * existed for however long the gap is, whatever this run then deletes.
 *
 * So the check costs no read, no column, no byte on any wire and nothing in a
 * browser: it is a subtraction over what a sweep already looked at.
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
   * Either it never reached the buffer — refused on its window, or the store
   * was unavailable — or the one instant it needed could not be read. A buffer
   * the sweep cannot see is a promise nothing can speak for, and the honest
   * answer is silence rather than *kept*.
   */
  | { readonly state: "unread" }
  /**
   * Nothing in the buffer is old enough to count, so nothing in it can be past
   * the ceiling.
   *
   * The strongest of the three quiet answers and the only one that is a proof.
   * A scan runs from the oldest end, so a run that found nothing ripe found
   * every delivery younger than the ripeness window — and the ceiling is that
   * window plus a sweep, which is longer. An empty buffer lands here too, for
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
      /** How old the oldest delivery still in the buffer was, in milliseconds. */
      readonly oldestMs: number
      /** The ceiling the notice publishes: the ripeness window plus one sweep. */
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
    }

/**
 * Judge one sweep's own evidence against the ceiling its deployment publishes.
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
  outcome: CollectionOutcome,
  retention: DeliveryRetention
): RetentionPromise => {
  if (retention.sweep.state !== "stated") return { state: "unpromised" }

  const { goneWithinMs } = retention.sweep

  if (outcome.outcome === "refused" || outcome.outcome === "unavailable") {
    return { state: "unread" }
  }
  if (outcome.outcome === "nothing-ripe") return { state: "unripe" }

  const { oldestMs } = outcome.summary

  if (!Number.isFinite(oldestMs)) return { state: "unread" }

  return oldestMs > goneWithinMs
    ? { state: "broken", oldestMs, goneWithinMs, byMs: oldestMs - goneWithinMs }
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
      return "nothing in the buffer is old enough to count, so no delivery is past the ceiling readers are promised"
    case "kept":
      return `the oldest delivery waiting is ${promise.oldestMs}ms old, and readers are promised one is gone within ${promise.goneWithinMs}ms of arriving`
    case "broken":
      return (
        `the oldest delivery waiting is ${promise.oldestMs}ms old and readers are promised one is gone within ${promise.goneWithinMs}ms of arriving, ` +
        `so that promise has been false for ${promise.byMs}ms: this deployment is sweeping less often than it stated, or not at all`
      )
  }
}
