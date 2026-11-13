import type { AudienceId } from "../../src/audience/audience.js"

import type { PageFeatures } from "./page.js"

/**
 * A kind of reader, and a world of them.
 *
 * A persona is data plus one rule: how likely it is to do the goal once it has
 * seen the goal's part on a page with these features. Everything else about it
 * is a number: how much of the traffic it is, how that moves with the day, how
 * far down a page it reads, how long it stays on a band, how often it presses
 * something that is not the goal.
 *
 * Its traits are what a site's segment rules sort on (0371). They never reach
 * Loom: a world may sort a reader into an audience, and only that `aud_` id
 * travels on its batches, as a real site's would (0384 clause 4).
 */

export type Traits = {
  readonly device: "phone" | "desktop"
  readonly source: "social" | "search" | "direct"
  readonly returning: boolean
}

export type Persona = {
  readonly name: string
  readonly traits: Traits
  /** Its weight in the traffic on a weekday, on day 0. Weights need not add to one. */
  readonly share: number
  /** What its weight is multiplied by on a Saturday or Sunday. */
  readonly weekend: number
  /** How much its weight grows each day, so the mix drifts between a before and an after. */
  readonly trend: number
  /** The chance it reads on past each band. It sees band `i` with chance `stay ** i`. */
  readonly stay: number
  /** About how long it spends on a band it sees, in milliseconds. */
  readonly bandMs: number
  /** The chance it presses each other control it sees. Noise around the goal, never the goal. */
  readonly wander: number
  /** The chance it does the goal, given it has seen the goal's part. */
  readonly chance: (page: PageFeatures) => number
}

export type World = {
  readonly name: string
  readonly personas: readonly Persona[]
  /** The audience a site would sort a reader with these traits into. Absent: everyone. */
  readonly audienceOf?: (traits: Traits) => AudienceId | undefined
}

const DAYS_A_WEEK = 7

const SATURDAY = 5

/** Day 0 is a Monday. */
export const isWeekend = (day: number): boolean => day % DAYS_A_WEEK >= SATURDAY

export const clampChance = (chance: number): number => Math.min(1, Math.max(0, chance))

const weightOn = (persona: Persona, day: number): number =>
  persona.share * (isWeekend(day) ? persona.weekend : 1) * (1 + persona.trend) ** day

/** Each persona's share of the readers who arrive on `day`, adding to one. */
export const sharesOn = (world: World, day: number): readonly number[] => {
  const weights = world.personas.map((persona) => weightOn(persona, day))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  return weights.map((weight) => (total === 0 ? 0 : weight / total))
}

/** The chance a persona sees band `band` (from 0): it always sees the first. */
export const seesBand = (persona: Persona, band: number): number => persona.stay ** band

/**
 * The chance one reader of this persona does the goal on a page with these
 * features: sees the goal's band, then takes its chance there. Zero on a page
 * without the goal's part.
 */
export const goalChanceOf = (persona: Persona, page: PageFeatures): number =>
  page.goalBand === undefined
    ? 0
    : seesBand(persona, page.goalBand) * clampChance(persona.chance(page))

/** Which persona a draw in [0, 1) picks, given the day's shares. */
export const pickPersona = (shares: readonly number[], draw: number): number => {
  const cumulative = shares.reduce<readonly number[]>(
    (sums, share) => [...sums, (sums.at(-1) ?? 0) + share],
    []
  )
  const picked = cumulative.findIndex((sum) => draw < sum)

  return picked === -1 ? shares.length - 1 : picked
}
