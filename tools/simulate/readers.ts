import type { ReaderSignal, ReaderSignalBatch } from "../../src/signals/signal.js"
import { mintViewKey } from "../../src/signals/view.js"
import type { LoomTree } from "../../src/tree/tree.js"

import { bytesOf, drawOf, happens, type DrawPath } from "./draw.js"
import {
  bandsOf,
  featuresOf,
  isControl,
  type Band,
  type PageElement,
  type SimGoal,
} from "./page.js"
import { clampChance, pickPersona, sharesOn, type Persona, type World } from "./persona.js"

/**
 * Simulated readers of one page on one day, as the batches their browsers
 * would send (`docs/simulation.md`, milestone S1).
 *
 * **A reader sends what a browser sends and nothing more** (0384 clause 4): a
 * page-view key, `viewed` for what came on screen, `dwelled` for how long a
 * band stayed there, and the goal's signal or another control's press, each
 * with the regions it happened inside. Which persona a reader was stays here,
 * on the `SimulatedView` beside its batches, and is never on a batch. A world
 * that sorts readers into audiences puts the `aud_` id on the batch, as a
 * site's segment rules would (0371).
 *
 * **One batch per band**, sent as the reader leaves it, and the first opens the
 * page view. The real broadcaster sends every few seconds instead; milestone S4
 * compares the two in a browser.
 *
 * **It is a pure function of its arguments.** Every chance is a named draw
 * (`draw.ts`), so the same seed gives the same readers, and the goal is done
 * with exactly the chance `effect.ts` adds up.
 */

export const DAY_MS = 24 * 60 * 60 * 1_000

export type ReadersOf = {
  readonly world: World
  readonly seed: number
  /** The page as the site serves it that day. */
  readonly tree: LoomTree
  readonly goal: SimGoal
  /** Days since day 0, which is a Monday. */
  readonly day: number
  /** The instant day 0 began, in milliseconds. A simulation's clock, never the wall's. */
  readonly dayZero: number
  /** How many readers open the page that day. */
  readonly count: number
}

export type SimulatedView = {
  /** Which persona read. The simulation's to know; never sent. */
  readonly persona: string
  readonly didGoal: boolean
  readonly batches: readonly ReaderSignalBatch[]
}

type Reader = {
  readonly persona: Persona
  readonly path: DrawPath
  readonly seed: number
}

/** How many bands a reader saw: the first always, each after it while they read on. */
const bandsSeenBy = (reader: Reader, bands: readonly Band[]): number => {
  const stopped = bands.findIndex(
    (_, band) =>
      band > 0 && !happens(reader.seed, [...reader.path, "stay", band], reader.persona.stay)
  )

  return stopped === -1 ? bands.length : stopped
}

const dwellOf = (reader: Reader, band: number): number =>
  Math.max(
    1,
    Math.round(reader.persona.bandMs * (0.5 + drawOf(reader.seed, [...reader.path, "dwell", band])))
  )

const delegated = (kind: SimGoal["kind"], element: PageElement, at: number): ReaderSignal => {
  const address = { nodeId: element.node.id, type: element.node.type, at, within: element.within }

  return kind === "disclosed" ? { kind, ...address, open: true } : { kind, ...address }
}

const signalsIn = (
  reader: Reader,
  elements: readonly PageElement[],
  timing: { readonly at: number; readonly dwell: number },
  goal: { readonly goal: SimGoal; readonly done: boolean }
): readonly ReaderSignal[] => {
  const first = elements[0]
  const seen = elements.map(
    (element): ReaderSignal => ({
      kind: "viewed",
      nodeId: element.node.id,
      type: element.node.type,
      at: timing.at,
    })
  )
  const dwelled: readonly ReaderSignal[] =
    first === undefined
      ? []
      : [{ kind: "dwelled", nodeId: first.node.id, type: first.node.type, ms: timing.dwell }]
  const wandered = elements
    .filter(
      (element) =>
        isControl(element.node) &&
        element.node.id !== goal.goal.nodeId &&
        happens(reader.seed, [...reader.path, "wander", element.node.id], reader.persona.wander)
    )
    .map((element) => delegated("activated", element, timing.at + Math.floor(timing.dwell / 3)))
  const target = elements.find((element) => element.node.id === goal.goal.nodeId)
  const did =
    goal.done && target !== undefined
      ? [delegated(goal.goal.kind, target, timing.at + Math.floor(timing.dwell / 2))]
      : []

  return [...seen, ...dwelled, ...wandered, ...did]
}

/** One reader's page view. */
const viewOf = (given: ReadersOf, bands: readonly Band[], index: number): SimulatedView => {
  const { world, seed, tree, goal, day, dayZero } = given
  const path: DrawPath = ["reader", tree.treeId, tree.revision, day, index]
  const persona =
    world.personas[pickPersona(sharesOn(world, day), drawOf(seed, [...path, "persona"]))]

  if (persona === undefined) throw new Error(`the world "${world.name}" has no personas`)

  const reader: Reader = { persona, path, seed }
  const page = featuresOf(bands, goal)
  const seen = bandsSeenBy(reader, bands)
  const done =
    page.goalBand !== undefined &&
    page.goalBand < seen &&
    happens(seed, [...path, "goal"], clampChance(persona.chance(page)))
  const view = mintViewKey((count) => bytesOf(seed, [...path, "view"], count))
  const audience = world.audienceOf?.(persona.traits)
  const arrivedAt = dayZero + day * DAY_MS + Math.floor(drawOf(seed, [...path, "arrive"]) * DAY_MS)

  const batches = bands
    .slice(0, seen)
    .reduce<{ readonly at: number; readonly batches: readonly ReaderSignalBatch[] }>(
      (sent, band, at) => {
        const dwell = dwellOf(reader, at)
        const signals = signalsIn(reader, band.elements, { at: sent.at, dwell }, { goal, done })
        const batch: ReaderSignalBatch = {
          treeId: tree.treeId,
          revision: tree.revision,
          sentAt: sent.at + dwell,
          ...(audience === undefined ? {} : { audience }),
          view,
          ...(at === 0 ? { first: true as const } : {}),
          signals: [...signals],
        }

        return {
          at: sent.at + dwell,
          batches: signals.length === 0 ? sent.batches : [...sent.batches, batch],
        }
      },
      { at: arrivedAt, batches: [] }
    ).batches

  return { persona: persona.name, didGoal: done, batches }
}

/** The readers who open `tree` on `day`, each as the batches their browser would send. */
export const readersOf = (given: ReadersOf): readonly SimulatedView[] => {
  const bands = bandsOf(given.tree)

  return Array.from({ length: given.count }, (_, index) => viewOf(given, bands, index))
}
