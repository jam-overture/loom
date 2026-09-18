import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { ReaderSignal, ReaderSignalBatch } from "./signal.js"

/**
 * Batches folded into what a node was read like: time on screen, whether it was
 * reached, what readers did in it.
 *
 * This is the live arithmetic — one accumulator, fed a batch at a time, held by
 * whatever is watching. `rollup.ts` answers the other question, *what happened
 * across many views*, and the two are separate because they have different
 * inputs: a fold sees the batches of one page as they arrive and knows nothing
 * about views, while rollup sees a window of stored batches from many views and
 * cannot be fed one at a time.
 *
 * It exists as a framework module because it had already been written twice —
 * `prototypes/ski-apparel/readings.mjs` is the working reference, and the
 * portal's view and any demo rail would each have grown their own. Arithmetic
 * rendered twice is arithmetic that drifts, and the version that drifts is
 * always the one nobody is looking at.
 *
 * **Labels are not here.** The prototype's fold also turns node ids into
 * section names and builds a feed of lines, using a legend that only that page
 * has. Naming a node is a property of the page, not of the signals, so it stays
 * with whoever has the legend. What is left is the part that is the same
 * everywhere.
 *
 * Pure, and safe in a browser: no package, no schema, no clock.
 */

/**
 * What a set of batches says about each node they mention.
 *
 * Keyed by node id rather than held as a list because folding is a hot path in
 * a page that is still being read — a list would be a scan per signal, and the
 * ledger this replaces was quadratic once already.
 */
export type ReaderReadings = {
  /** Total time on screen. Summed across batches, because `dwelled` is per-batch. */
  readonly dwellMs: Readonly<Record<NodeId, number>>
  /** Nodes that came into view at all. `viewed` fires once per node per page view. */
  readonly reached: Readonly<Record<NodeId, true>>
  /**
   * Times the node itself was used — a link followed, a button pressed, a field
   * filled.
   *
   * It is the node the signal names, which is the nearest addressed element to
   * what a reader aimed at. In the starter library that is the control, so a
   * band's count here is zero however busy the band was; `engagements` is the
   * number that is about the band.
   */
  readonly activations: Readonly<Record<NodeId, number>>
  readonly opens: Readonly<Record<NodeId, number>>
  readonly closes: Readonly<Record<NodeId, number>>
  /**
   * Times a reader used something *inside* the node — pressed, followed, filled,
   * opened or closed, at any depth.
   *
   * The regions' number. Read off the ancestry a delegated signal carries, so a
   * batch whose senders did not walk contributes nothing rather than a guess.
   * Strictly inside, so a control's own use is in `activations` and never here,
   * and a subtree total is the addition.
   *
   * Occurrences rather than readers, because a fold is one page view: *how many
   * of the people reading this used something in the band* is a question about
   * many views, and it is `ReaderTally.engaged`.
   */
  readonly engagements: Readonly<Record<NodeId, number>>
  /**
   * What each node is, as its signals reported it. Kept because a consumer
   * holding only readings would otherwise have to go back to the tree to render
   * a row, and the signals already say.
   *
   * A region named only as somewhere a press happened inside is in here too, so
   * it gets a row rather than being a number with no name.
   */
  readonly types: Readonly<Record<NodeId, PrimitiveType>>
  readonly batches: number
  readonly signals: number
}

export const EMPTY_READINGS: ReaderReadings = {
  dwellMs: {},
  reached: {},
  activations: {},
  opens: {},
  closes: {},
  engagements: {},
  types: {},
  batches: 0,
  signals: 0,
}

const bumped = (
  counts: Readonly<Record<NodeId, number>>,
  nodeId: NodeId,
  by: number
): Readonly<Record<NodeId, number>> => ({ ...counts, [nodeId]: (counts[nodeId] ?? 0) + by })

/**
 * The regions a delegated signal says it happened inside, and their types, which
 * a reading knows exactly as it knows the node's own.
 */
const withinOf = (signal: ReaderSignal): readonly { nodeId: NodeId; type: PrimitiveType }[] =>
  (signal.kind === "activated" || signal.kind === "disclosed") && signal.within !== undefined
    ? signal.within
    : []

/** Every node a signal mentions is one this reading now knows the type of. */
const foldSignal = (readings: ReaderReadings, signal: ReaderSignal): ReaderReadings => {
  const { nodeId } = signal
  const within = withinOf(signal)

  return {
    ...readings,
    engagements: within.reduce((counts, region) => bumped(counts, region.nodeId, 1), readings.engagements),
    dwellMs: signal.kind === "dwelled" ? bumped(readings.dwellMs, nodeId, signal.ms) : readings.dwellMs,
    reached: signal.kind === "viewed" ? { ...readings.reached, [nodeId]: true } : readings.reached,
    activations:
      signal.kind === "activated" ? bumped(readings.activations, nodeId, 1) : readings.activations,
    opens: signal.kind === "disclosed" && signal.open ? bumped(readings.opens, nodeId, 1) : readings.opens,
    closes: signal.kind === "disclosed" && !signal.open ? bumped(readings.closes, nodeId, 1) : readings.closes,
    types: {
      ...readings.types,
      ...Object.fromEntries(within.map((region) => [region.nodeId, region.type])),
      [nodeId]: signal.type,
    },
  }
}

/**
 * One more batch, folded in.
 *
 * The batch's tree and revision are not checked against anything, because a
 * reading is about one page and the caller is the one holding it. Folding two
 * revisions into one accumulator is a caller's mistake and it is the caller who
 * can see it — `rollup.ts` is the module that keeps revisions apart, because it
 * is the one that is handed a mixture.
 */
export const foldReaderSignals = (readings: ReaderReadings, batch: ReaderSignalBatch): ReaderReadings => {
  const folded = batch.signals.reduce(foldSignal, readings)

  return { ...folded, batches: readings.batches + 1, signals: readings.signals + batch.signals.length }
}

export const readingsOf = (batches: readonly ReaderSignalBatch[]): ReaderReadings =>
  batches.reduce(foldReaderSignals, EMPTY_READINGS)

/** One node's line, as something rendering a table wants it. */
export type NodeReading = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly dwellMs: number
  readonly reached: boolean
  readonly activations: number
  readonly opens: number
  readonly closes: number
  /** Times a reader used something inside it, at any depth. */
  readonly engagements: number
}

/**
 * Readings as rows, longest on screen first.
 *
 * The order is a default rather than a claim: a caller with a legend almost
 * always wants the page's own order instead, which it can produce because every
 * row names its node. What a caller without one wants is the interesting end
 * first.
 */
export const nodeReadingsOf = (readings: ReaderReadings): readonly NodeReading[] =>
  Object.keys(readings.types)
    .map((key) => {
      const nodeId = key as NodeId

      return {
        nodeId,
        type: readings.types[nodeId] as PrimitiveType,
        dwellMs: readings.dwellMs[nodeId] ?? 0,
        reached: readings.reached[nodeId] === true,
        activations: readings.activations[nodeId] ?? 0,
        opens: readings.opens[nodeId] ?? 0,
        closes: readings.closes[nodeId] ?? 0,
        engagements: readings.engagements[nodeId] ?? 0,
      }
    })
    .sort((first, second) => second.dwellMs - first.dwellMs)
