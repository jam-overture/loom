import type { KindPace, LibraryPace, LibraryPaceOptions } from "./library-pace.js"
import { libraryPaceOf } from "./library-pace.js"
import { regionPagesOf, type RegionPagesReading } from "./region-pages.js"
import { silenceCensusOf, type ReadingSilence, type SilenceCensus } from "./silence-census.js"
import { meaningOfKindPaceSilence } from "./silences.js"
import {
  distinctRegionRows,
  type DeploymentReadingContext,
  type ReaderWindow,
  type WindowAssembly,
} from "./window.js"

/**
 * The second rung: the figures a window holds about **itself**, rather than
 * about one of the subjects the assembly under this publishes.
 *
 * `windowAssemblyOf` turns a window into the three subjects every reading and
 * comparison takes — the readings, the pairs, the two libraries — and after it,
 * forty of the forty-two readings are **one call with one argument**:
 * `reachOf(readings.pages[0])`, `libraryChangeOf(libraries.was.readings,
 * libraries.now.readings)`. Nothing can be composed wrongly, because there is
 * nothing to compose.
 *
 * **Three were not.** `regionPagesOf` (§62), `silenceCensusOf` (§63) and
 * `libraryPaceOf` (§64) each need something the assembly does not publish, and
 * all three were therefore reachable only by a caller that already knew they
 * existed. That was filed as one gap each and then as a pattern, with a
 * recommendation that a run take all three at once rather than adding any of
 * them individually — because each of the three composes in a way that
 * **type-checks, runs, and is wrong without saying so**:
 *
 * ```ts
 * // All three of these compile.
 * regionPagesOf(window.regions ?? [], { floor: DEFAULT_REGION_FLOOR })
 * libraryPaceOf(libraries.now.readings, window.pageViews)
 * silenceCensusOf(pages.map((page) => ({ meaning: meaningOfKindSilence(…) })))
 * ```
 *
 * ## The three things a caller writing those lines gets wrong
 *
 * **A region row set has to be deduplicated before it is read, and the floor
 * has to be the deployment's own.** Two readings of one window's regions are
 * published here — the assembly's `readership` map and this breakdown by page —
 * and they are built from the same rows at the same floor, so they must drop the
 * same repeats. The assembly's does (`distinctRegionRows`); a caller handing
 * `window.regions` straight to `regionPagesOf` does not, and a doubled bucket
 * is worse than a wrong number: it **clears a floor it should not have
 * cleared**, so a place with too few readers to name gets named (0146, 0158).
 * The floor comes off the context for the same reason — a number typed at this
 * call site can differ from the one the assembly's maps were read at, and then
 * one window has two readerships.
 *
 * **`?? []` is the wrong collapse.** {@link ReaderWindow.regions} is
 * `undefined` where no region store was offered and `[]` where one answered
 * with nothing, and those are two sentences: *we cannot say where your readers
 * are* and *you have no readers abroad* (0240, 0309). So the figure is
 * `undefined` or a reading, carried exactly as the window carries it.
 *
 * **A kind's pace is over the window's readings and not over a library.** Every
 * other reading of a kind takes `libraries.was` or `libraries.now`, so the
 * nearest line to hand is the wrong one: a side of a library holds one reading
 * per form, which drops the earlier revision of every page revised inside the
 * window and every form the placings could not place. `libraryPaceOf` is a
 * reading rather than a comparison, so its evidence is every reading the window
 * holds.
 *
 * ## What the census is over, which is the only thing a caller chooses
 *
 * A census's denominator is *the readings somebody is looking at*, and this
 * cannot know what a surface draws. So {@link WindowFigures.census} is over the
 * entries the caller handed in **plus the rows of the pace this took**, and the
 * list it was taken over is published beside it so that a caller may take a
 * narrower one. The caller's entries come first, so where a state is reported by
 * both it keeps the caller's vocabulary — its readings are the ones on the
 * screen (0324).
 *
 * What this adds is the mapping, which is the part nothing reminded anybody of:
 * each of the pace's kind rows is mapped through `meaningOfKindPaceSilence` and
 * attributed to **no page**, because a kind is not a page and putting it on a
 * form would be a guess (0324, 0240).
 *
 * ## It composes and does not count
 *
 * Nothing here counts, divides, sums or withholds — the rule the four steps
 * under it keep. It decides **which rows each of three published readings is
 * entitled to** and calls them. In particular there is no total of what the
 * three left out: a withheld region bucket, a kind with no pace and a silent
 * reading are three different absences in three different units, and a sum over
 * them would be a figure in none.
 *
 * **It is not where `arrivalStandingOf` goes.** A refusal is not in a window at
 * all — it is the deployment's own counter, keyed by application and reason,
 * written on the request path and holding nothing a window holds (0309, 0326).
 * Carrying its result through as a field would add no figure and would make this
 * whole type generic in a deployment's refusal reasons for one passthrough. A
 * surface that wants both calls both.
 *
 * Linear in the window, being one pass for the rows and one reading each.
 */

/** What a window says about itself, once its subjects have been assembled. */
export type WindowFigures = {
  /**
   * Where the readers were and what the readers of each place read, or
   * `undefined` where no region store was offered.
   *
   * Its `map` is the assembly's `readings.regions.readership` — the same rows at
   * the same floor — so a surface drawing both cannot show two readerships of
   * one window.
   */
  readonly regions: RegionPagesReading | undefined
  /** What the library asks of its readers' time, by kind of part, over every reading the window holds. */
  readonly pace: LibraryPace
  /**
   * The states this window is in, over the caller's readings and the pace's own
   * rows.
   *
   * `census.readings === silences.length`, which is the identity that says the
   * denominator is the published list and nothing else.
   */
  readonly census: SilenceCensus
  /**
   * Every entry the census was taken over, the caller's first and then the
   * pace's, so a caller may slice it and take a census of its own.
   */
  readonly silences: readonly ReadingSilence[]
}

/** What the figures are read at, beyond what the context already says. */
export type WindowFigureOptions = LibraryPaceOptions & {
  /**
   * The silences of the readings the caller took over this window's subjects,
   * one entry per reading and each already mapped through its own vocabulary's
   * `meaningOf…Silence`.
   *
   * A reading that answered is handed in with `meaning: null` rather than left
   * out, which is what gives a page's readings a denominator (0324). Left out
   * entirely, the census is over the pace's rows alone — which is a true census
   * of what this rung computed and not of what a screen shows.
   */
  readonly silences?: readonly ReadingSilence[]
}

/** One census entry per kind row, of no page, because a kind is not a page. */
const silencesOfPace = (pace: LibraryPace): readonly ReadingSilence[] =>
  [...pace.byType, ...pace.byRole].map(
    (row: KindPace): ReadingSilence => ({
      meaning: row.silence === null ? null : meaningOfKindPaceSilence(row.silence),
      form: null,
    })
  )

/**
 * Read the figures a window holds about itself off one call.
 *
 * ```ts
 * const assembly = windowAssemblyOf(window, context)
 * const figures = windowFiguresOf(window, assembly, context)
 * ```
 *
 * The window and the context are handed in again rather than carried on the
 * assembly: two of the three readings here are of **rows** the assembly
 * deliberately does not republish, and the floor has to be the one the
 * assembly's own maps were read at. Both are arguments the caller passed one
 * line above, so nothing is gone looking for.
 */
export const windowFiguresOf = (
  window: ReaderWindow,
  assembly: WindowAssembly,
  context: DeploymentReadingContext,
  options: WindowFigureOptions = {}
): WindowFigures => {
  const pace = libraryPaceOf(assembly.readings.pages, window.pageViews, {
    ...(options.wordsPerMinute === undefined ? {} : { wordsPerMinute: options.wordsPerMinute }),
  })

  const silences: readonly ReadingSilence[] = [
    ...(options.silences ?? []),
    ...silencesOfPace(pace),
  ]

  return {
    regions:
      window.regions === undefined
        ? undefined
        : regionPagesOf(distinctRegionRows(window.regions).kept, { floor: context.floor }),
    pace,
    census: silenceCensusOf(silences),
    silences,
  }
}
