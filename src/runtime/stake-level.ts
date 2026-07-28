import { z } from "zod"

/**
 * How much damage a change does if it turns out to be wrong. Four levels is
 * enough to separate "just do it" from "ask first" from "refuse", with one
 * level of headroom in between.
 */
export const stakeLevelSchema = z.enum(["low", "medium", "high", "critical"])
export type StakeLevel = z.infer<typeof stakeLevelSchema>

export const STAKE_ORDER: readonly StakeLevel[] = ["low", "medium", "high", "critical"]

const rankOf = (level: StakeLevel): number => STAKE_ORDER.indexOf(level)

export const compareStakes = (left: StakeLevel, right: StakeLevel): number =>
  rankOf(left) - rankOf(right)

export const isAtLeast = (level: StakeLevel, floor: StakeLevel): boolean =>
  compareStakes(level, floor) >= 0

export const isAbove = (level: StakeLevel, ceiling: StakeLevel): boolean =>
  compareStakes(level, ceiling) > 0

/** The highest level present, or `low` when nothing raised a concern. */
export const highestStake = (levels: readonly StakeLevel[]): StakeLevel =>
  levels.reduce<StakeLevel>((highest, level) => (isAbove(level, highest) ? level : highest), "low")
