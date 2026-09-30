import type { NodeData } from "../data/resolution.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"

/**
 * What a primitive could not show of an answer it was given, and how the walk
 * is told.
 *
 * Every other way a binding can be wrong is visible from outside the primitive:
 * an unregistered source is `data-unavailable`, a malformed declaration is
 * `data-misdeclared`, a name nothing reads is `data-unread` (0181). One is not.
 * A source can answer perfectly, under a name the primitive reads, with rows the
 * primitive then declines row by row — because each row has a shape only the
 * primitive knows, and eleven of twelve failing it is the author's problem and
 * nobody else's.
 *
 * `loom.feed` is the case that made this cost something. 0175 says a listing
 * skips the row it cannot read and names it, and the feed does say so — *"Some
 * entries could not be shown."*, drawn on the page, deliberately without a
 * count, because a number there is a plural this library cannot form in every
 * language it may be served in. The count is not useless. It is useful to
 * exactly one person and that person is not the reader: the author whose source
 * started returning a column under a new name wants to know that eleven of
 * twelve rows stopped reading. Every comparable finding in the walk is a
 * diagnostic, and a primitive had no way to raise one.
 *
 * **The primitive returns a reading; the runtime decides whether to report it.**
 * Nothing here hands a component a way to write into the walk's output, and that
 * is the point rather than an omission — see 0206. A component body runs when
 * React renders the element, which is *after* `renderLoomTree` has returned its
 * diagnostics, as many times as React likes and sometimes not at all. A
 * diagnostic pushed from there lands in an array the caller may have read
 * already, twice under `StrictMode`, and never in a medium that renders the
 * element some other way. A declaration the walk *calls* has none of that: once
 * per node, inside the walk, before anybody sees the array.
 */

/**
 * What a primitive made of one answer: the rows it was given, and the rows it
 * placed.
 *
 * Both numbers rather than the difference, because the sentence the author needs
 * is *eleven of twelve* and a lone `11` cannot say it. Numbers rather than the
 * rows themselves, because a diagnostic is logged and a row is the host's data —
 * the same line `data-unavailable` holds, which names the source and not what it
 * answered.
 *
 * A reading is owed for every answer the primitive read, including the ones it
 * read whole. Whether `shown === given` is worth saying out loud is the walk's
 * call and not the primitive's, the way every other diagnostic in this package
 * is the walk's call.
 */
export type UnshownReading = {
  /** The binding name the answer arrived under. */
  readonly name: string
  /** Rows in the answer as the primitive found it. */
  readonly given: number
  /** Rows the primitive placed on the page. */
  readonly shown: number
}

/**
 * What a primitive declares: its own reading of this node's answers.
 *
 * A function, where every other declaration on a definition is data, and the
 * asymmetry is the honest one. `reads` is a list of *names*, and a name is data
 * — which is why 0184 could give it a `fromProp` form rather than a callback.
 * How many rows survived a schema is not data about a primitive; it is the
 * primitive reading an answer, which is code by nature and is code the primitive
 * already contains, because it had to decide what to skip in order to skip it.
 *
 * It receives exactly what the component receives of the same two things — the
 * node's props as the tree wrote them, and the host's answers — so it can be
 * the same function the component calls, which is the only way the count and the
 * page cannot disagree. It receives nothing it could not already touch: the
 * component is handed both objects too.
 *
 * Called once per node, inside the walk. It must be pure and it must not wait:
 * there is nothing to wait for, every answer having been resolved before the
 * walk began.
 */
export type UnshownDeclaration = (
  props: JsonObject,
  data: NodeData
) => readonly UnshownReading[]

/**
 * Which primitive declares a reading, asked per type.
 *
 * Structural, and detected the way `BindingReader`, `FrameResolver` and
 * `BehaviourResolver` are: a registry built by the SDK satisfies it, and a host
 * resolving from a plain map has registered nothing that could have declared
 * one — so there is nothing here for a host to wire and nothing that can go
 * missing.
 */
export interface UnshownReader {
  readonly unshownBy: (type: PrimitiveType) => UnshownDeclaration | undefined
}

export const isUnshownReader = (value: object): value is UnshownReader =>
  typeof (value as Partial<UnshownReader>).unshownBy === "function"

/**
 * Why a declaration's readings could not be believed.
 *
 * Both kinds are faults in the primitive rather than in the tree or the
 * deployment, which is why they are one shape reported to one person: whoever
 * wrote the component. A tree cannot cause either.
 */
export type UnshownFault =
  | {
      /**
       * The declaration threw. Rendering is total (see `diagnostics.ts`) and a
       * declaration is not a licence to make it otherwise — a page lost to a
       * primitive's *bookkeeping* would be the worst trade in this package.
       */
      readonly kind: "threw"
      readonly detail: string
    }
  | {
      /**
       * A reading that cannot describe anything: an unnamed answer, a count that
       * is not a whole number of rows, or more rows shown than given. Refused
       * rather than clamped, because a diagnostic saying *thirteen of twelve*
       * sends the author to look for a defect that is in the primitive telling
       * them about it.
       */
      readonly kind: "impossible"
      readonly detail: string
    }

export const describeUnshownFault = (fault: UnshownFault): string =>
  fault.kind === "threw"
    ? `the declaration threw — ${fault.detail}`
    : `the declaration returned a reading that cannot describe an answer — ${fault.detail}`

const countable = (value: number): boolean => Number.isSafeInteger(value) && value >= 0

const faultIn = (reading: UnshownReading, index: number): string | undefined => {
  const at = `reading ${index}`

  if (typeof reading.name !== "string" || reading.name === "") {
    return `${at} names no binding`
  }

  if (!countable(reading.given)) {
    return `${at} ("${reading.name}") was given ${String(reading.given)} rows`
  }

  if (!countable(reading.shown)) {
    return `${at} ("${reading.name}") showed ${String(reading.shown)} rows`
  }

  if (reading.shown > reading.given) {
    return `${at} ("${reading.name}") showed ${reading.shown} of ${reading.given} rows`
  }

  return undefined
}

/**
 * The readings one declaration makes of this node, or the fault that means there
 * are none to be had.
 *
 * Guarded, because the declaration is another author's code running inside a
 * walk whose whole contract is that it always returns an element. A throw here
 * would take a page down over a count nobody asked to be told, so a throw is
 * caught and becomes the thing it was trying to report.
 *
 * Validated for the same reason, one step further on: a reading that says more
 * rows were shown than arrived is not a small inaccuracy in a diagnostic, it is
 * a diagnostic that sends its reader hunting the wrong defect. The whole batch
 * is refused rather than the bad reading dropped — a declaration that miscounted
 * one answer has not earned belief about the others, and a partial report is
 * indistinguishable from a complete one once it is in a log.
 *
 * A declaration returning something that is not an array at all reaches
 * `impossible` too: the type says otherwise and a host's JavaScript need not
 * agree with it.
 */
export const readUnshown = (
  declaration: UnshownDeclaration,
  props: JsonObject,
  data: NodeData
): Result<readonly UnshownReading[], UnshownFault> => {
  let readings: readonly UnshownReading[]

  try {
    readings = declaration(props, data)
  } catch (thrown) {
    return err({
      kind: "threw",
      detail: thrown instanceof Error ? thrown.message : String(thrown),
    })
  }

  if (!Array.isArray(readings)) {
    return err({ kind: "impossible", detail: "the declaration returned no readings at all" })
  }

  for (const [index, reading] of readings.entries()) {
    if (typeof reading !== "object" || reading === null) {
      return err({ kind: "impossible", detail: `reading ${index} is not a reading` })
    }

    const fault = faultIn(reading, index)
    if (fault !== undefined) return err({ kind: "impossible", detail: fault })
  }

  return ok(readings)
}

/**
 * The readings worth reporting, in the order the walk reports them.
 *
 * An answer the primitive read whole is not a diagnostic — it is the ordinary
 * case, and a walk that reported it would put one line per bound region into
 * every log on every page. Name-sorted for the reason `unreadBindings` sorts:
 * the caller emits one diagnostic per reading, and a list whose order follows a
 * declaration's own array order is one a test can only assert loosely.
 */
export const unshownRows = (
  readings: readonly UnshownReading[]
): readonly UnshownReading[] =>
  readings
    /** `filter` copies, so the sort below never reaches the declaration's own array. */
    .filter((reading) => reading.shown < reading.given)
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
