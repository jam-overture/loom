import type { LoomTree } from "../../src/tree/tree.js"

import { bandsOf, featuresOf, type SimGoal } from "./page.js"
import { goalChanceOf, sharesOn, type World } from "./persona.js"

/**
 * What a change truly does, which no real site can know.
 *
 * Because a world's rules are ours, the share of page views that do the goal
 * on a page is a sum, not an estimate: each persona's share of the day's
 * readers, times its chance of seeing the goal's part, times its chance of
 * doing the goal there. The readers `readers.ts` simulates are drawn from
 * exactly these chances, so over many page views their rate converges on this
 * one, and a verdict can be scored against it (0384 clause 5).
 */

/** Days, from day 0 (a Monday), closed at `from` and open at `to`. */
export type DaySpan = {
  readonly from: number
  readonly to: number
}

export type TrueEffect = {
  /** The goal's rate per page view on the old page. */
  readonly before: number
  /** The goal's rate per page view on the new page, over the same days. */
  readonly after: number
  /** `after - before`, in rate per page view. */
  readonly difference: number
  /** `after / before - 1`. Absent when nobody did the goal on the old page. */
  readonly relative: number | undefined
}

const daysIn = (span: DaySpan): readonly number[] =>
  Array.from({ length: Math.max(0, span.to - span.from) }, (_, index) => span.from + index)

/** The goal's rate per page view on `tree` among the readers who arrive on `day`. */
export const goalRateOn = (world: World, tree: LoomTree, goal: SimGoal, day: number): number => {
  const page = featuresOf(bandsOf(tree), goal)
  const shares = sharesOn(world, day)

  return world.personas.reduce(
    (rate, persona, index) => rate + (shares[index] ?? 0) * goalChanceOf(persona, page),
    0
  )
}

/** The goal's rate over a span, each day weighted the same, as a day's traffic is. */
export const goalRateOver = (
  world: World,
  tree: LoomTree,
  goal: SimGoal,
  span: DaySpan
): number => {
  const days = daysIn(span)

  return days.length === 0
    ? 0
    : days.reduce((sum, day) => sum + goalRateOn(world, tree, goal, day), 0) / days.length
}

/**
 * What changing `before` into `after` does to the goal, **with the readers held
 * the same**: both pages are read by the same days' mix. A verdict compares a
 * before window with a later after window, so the mix drifts under it; this is
 * the figure that drift is measured against.
 */
export const trueEffectOf = (
  world: World,
  pages: { readonly before: LoomTree; readonly after: LoomTree },
  goal: SimGoal,
  span: DaySpan
): TrueEffect => {
  const before = goalRateOver(world, pages.before, goal, span)
  const after = goalRateOver(world, pages.after, goal, span)

  return {
    before,
    after,
    difference: after - before,
    relative: before === 0 ? undefined : after / before - 1,
  }
}
