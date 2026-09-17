import { z } from "zod"

import { everyMemberOf } from "../closed-set.js"

/**
 * The scale the gate weighs a change on, and the order it compares two of them
 * in.
 *
 * It lives on its own because both halves of the runtime read it and neither
 * owns it: the analysis assigns a level, the policy has a ceiling, and a
 * comparison between the two is the whole of the verdict.
 */

/**
 * How much damage a change does if it turns out to be wrong. Four levels is
 * enough to separate "just do it" from "ask first" from "refuse", with one
 * level of headroom in between.
 */
export const stakeLevelSchema = z.enum(["low", "medium", "high", "critical"])
export type StakeLevel = z.infer<typeof stakeLevelSchema>

/**
 * The scale in severity order, which is the order and not merely the set.
 *
 * Checked for completeness where it is written rather than by a test, because a
 * test that holds a list against a second hand-written copy of the same four
 * strings fails when somebody edits the copy and not when somebody edits the
 * union. The order stays spelled out: it is arithmetic the Gate reads, and
 * deriving it from `stakeLevelSchema.options` would make the order a member is
 * declared in load-bearing for what the Gate does about it (0166).
 */
export const STAKE_ORDER: readonly StakeLevel[] = everyMemberOf<StakeLevel>()([
  "low",
  "medium",
  "high",
  "critical",
])

/**
 * Where a level sits on the scale.
 *
 * `indexOf` answers `-1` for a level this list does not name, which ranks it
 * *beneath* `low` — so every comparison below answers the reassuring `false`,
 * both of the Gate's stakes rules stay silent, and the one level it could not
 * weigh is the one it waves through. Measured: under `defaultGatePolicy` an
 * unplaceable level is `accepted / within-policy` where `critical` is refused.
 *
 * The list above is now complete at compile time, so the route that worried the
 * finding — a fifth member added to the schema — stops the declaration
 * compiling before it can reach here. What is left is a level that arrives
 * without passing through the types at all: cast at a seam, or read back off a
 * record a newer deployment wrote. Ranking that at the top of the scale rather
 * than beneath it is the remaining half, and it is blocked rather than
 * forgotten: lesson 25 teaches this arithmetic as its worked example and
 * live-checks the transcript, so the lesson's rewrite lands first. Filed
 * 2026-09-17.
 */
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
