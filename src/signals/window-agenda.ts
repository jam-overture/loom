import { deploymentAgendaOf, type DeploymentAgenda } from "./agenda.js"
import { deploymentConversionOf, type DeploymentConversion } from "./conversion.js"
import { deploymentReadingOf, type DeploymentReading } from "./deployment.js"
import {
  collectionHealthOf,
  type CollectionHealth,
  type CollectionSchedule,
} from "./health.js"
import { readingProgressOf, type ReadingProgress } from "./progress.js"
import type { WindowFunnels } from "./window-funnels.js"
import type { ReaderWindow, WindowAssembly } from "./window.js"

/**
 * The deployment's fix-list, off one window, in one call.
 *
 * `deploymentAgendaOf` answers *what should this deployment do next* — one line
 * saying *rewrite this page*, *rewrite this ask* or *repair this measurement*,
 * with the page named
 * ([0330](../../decisions/0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md),
 * [0336](../../decisions/0336-a-fault-reaches-a-conversion-and-a-fall-differently-so-the-fix-list-asks-each-order-its-own-question.md)).
 * It is the reading a deployment's screen opens with, and it is the furthest
 * thing in this subsystem from a store: three readings, over two row sets, with
 * a per-page reading derived under one of them.
 *
 * 0330 rejected deriving its inputs inside it, and that still holds — each of
 * the three is separately useful and separately drawn, and deriving any of them
 * twice is how two screens come to disagree about one deployment. What it also
 * said, in rejecting a home for the composition, was that *both of its inputs
 * are one call with one argument, so there is nothing here a caller can get
 * wrong.* **That was true of two inputs and is not true of three.** This is the
 * line it was said about, as a caller has to write it today:
 *
 * ```ts
 * const agenda = deploymentAgendaOf(
 *   deploymentReadingOf(assembly.readings.pages.map(readingProgressOf), window.pageViews),
 *   deploymentConversionOf(windowFunnelsOf(window, assembly).pages),
 *   collectionHealthOf(assembly.readings.pages, window.pageViews)
 * )
 * ```
 *
 * ## The three things a caller writing that line gets wrong
 *
 * **The schedule is the one that fails silently and in the unsafe direction.**
 * The third argument to `collectionHealthOf` is optional, because a caller with
 * no schedule to state should get a reading that judges nothing rather than one
 * that judges against a default. The line above leaves it out — and what that
 * costs is not a missing row.
 *
 * `collection-stalled` is never raised, so a deployment whose folds have stopped
 * reads **sound**; and because a stalled fold reaches both ranking keys, the
 * fall and the leak it manufactured are never withdrawn either. The two readings
 * of one window differ by one fault and say the opposite thing about the same
 * page: *rewrite this page* where no schedule was stated, *repair this
 * measurement* where one was. An operator sent to rewrite a page whose numbers
 * are an artefact of its own stalled collection is the exact failure the
 * fix-list was built to prevent
 * ([0330](../../decisions/0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)),
 * arriving through the one argument nothing asked for.
 *
 * So here it is required and may be `null`: *this deployment states no schedule*
 * is a word a reviewer can read rather than a space where an argument is not.
 * That is the shape the region floor was given, for the same reason
 * ([0322](../../decisions/0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md)).
 *
 * **The progress readings are over the window's readings and not over a
 * library.** The nearest line to hand maps `libraries.now.readings`, which
 * type-checks, runs, and drops the earlier revision of every page revised inside
 * the window and every form the placings could not place — so the fix-list is an
 * order over some of the deployment's pages with nothing saying which
 * ([0327](../../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)).
 *
 * **All three readings have to be of one window.** `DeploymentAgenda.unpaired`
 * exists because they need not be: a caller holding an order of one window and a
 * health reading of another gets a join of the intersection and a count of what
 * fell out of it. From here the three are over one assembly's one set of
 * readings, so all three counts are **nought by construction** and the fix-list
 * is of every page the window holds.
 *
 * ## Why the funnels are taken and the other two are made
 *
 * The rule is the one the rungs under this already keep, stated so the next
 * reading added here does not have to re-derive it: **a reading with a published
 * call of its own is handed in; a reading that is one call over the assembly's
 * own readings is made.**
 *
 * `windowFunnelsOf` is that published call
 * ([0333](../../decisions/0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)),
 * and its whole point is that every side of every funnel comparison is the same
 * object as the reading of that form — so reading the funnels again here would
 * put two answers of one revision on one screen, which is the thing that call
 * exists to make impossible. The order of falls and the health reading have no
 * such call, and both are made here and published whole.
 *
 * ## It composes and does not count
 *
 * Nothing here counts, divides, sums or withholds — the rule the rungs under it
 * keep. It decides which rows each of four published readings is entitled to and
 * calls them. In particular there is no total over what the four left out: an
 * unranked page, a page with no question, a faultless page and a page the door
 * cannot scale are four different absences, and a sum over them would be a
 * figure in none.
 *
 * Linear in the window, being one pass of each reading over the same readings.
 */

/** A deployment's fix-list and each of the readings it was joined from. */
export type WindowAgenda = {
  /**
   * Where reading stops on each page the window holds, in the readings' own
   * order.
   *
   * Published because it is drawn: a screen that names the page to fix next
   * shows the run of parts the fall is in, and these are the readings the order
   * below was ranked from rather than a second set of them.
   */
  readonly progress: readonly ReadingProgress[]
  /**
   * The pages by the readers each loses at its sharpest fall, worst first.
   *
   * `duplicated` and `duplicatedRows` are nought from here: the assembly never
   * holds two readings of one page, and the window's door rows are its own set.
   */
  readonly order: DeploymentReading
  /**
   * The pages by the readers each loses between the two ends of its sharpest
   * question, worst first.
   *
   * Read off the funnel answers handed in, so a page is in this order exactly
   * where that answer put it.
   */
  readonly conversion: DeploymentConversion
  /**
   * What is wrong with what this deployment collects, page by page.
   *
   * Judged against the schedule handed in, and judging no fold at all where
   * that was `null`.
   */
  readonly health: CollectionHealth
  /**
   * The fix-list: the two orders of pages, the measurements to repair, and the
   * one thing to do first.
   *
   * Its `unpaired` counts are nought by construction and its `duplicated` is
   * nought by construction, which is the whole of what this rung guarantees
   * beyond saving the lines.
   */
  readonly agenda: DeploymentAgenda
}

/**
 * Read a deployment's fix-list off a window, its assembly and its funnels.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const funnels = windowFunnelsOf(window, assembly)
 * const { agenda } = windowAgendaOf(window, assembly, funnels, { at, foldsWithinMs })
 * ```
 *
 * The window is handed in again rather than carried on the assembly, exactly as
 * the two rungs beside this take it: the door rows all three readings are
 * scaled by are the ones the assembly does not republish, and they are an
 * argument the caller passed one line above.
 *
 * The context is not taken. None of the three readings holds a region bucket or
 * places a form, so neither of the two context fields the figures rung needs has
 * anything to reach here — and the schedule is not a context field, because half
 * of it is the instant the reading is taken and a context that held a clock
 * would answer differently on two calls over one window.
 *
 * @param schedule What the deployment folds within and when this reading is
 * taken, or `null` where it states no schedule and nothing about a stalled fold
 * is to be judged. Required rather than optional, because the reading that is
 * lost by leaving it out is a fault going unreported.
 */
export const windowAgendaOf = (
  window: ReaderWindow,
  assembly: WindowAssembly,
  funnels: WindowFunnels,
  schedule: CollectionSchedule | null
): WindowAgenda => {
  const progress = assembly.readings.pages.map(readingProgressOf)

  const order = deploymentReadingOf(progress, window.pageViews)
  const conversion = deploymentConversionOf(funnels.pages)
  const health =
    schedule === null
      ? collectionHealthOf(assembly.readings.pages, window.pageViews)
      : collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)

  return {
    progress,
    order,
    conversion,
    health,
    agenda: deploymentAgendaOf(order, conversion, health),
  }
}
