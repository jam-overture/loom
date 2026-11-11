import { goalIdSchema, type Goal, type GoalId } from "./goals/goal"
import type { HoldStanding } from "./proposing/following"
import { HOLD_STANDINGS } from "./vocabulary"

/**
 * The filters on *For review* (`docs/portal-wireframes.md`, *2 · For review*):
 * a goal picker, and standing chips *All · Fits the live page · Stale ·
 * Conflicts*, each with its count. Pure.
 *
 * Both live in the address (`?goal=`, `?standing=`), so a filtered list is a
 * link like any other. Each choice is counted with the other filter applied,
 * so a count is always the number of cards picking it would show.
 */

/** `null` is every goal; `"none"` is the changes raised before proposals named one (0352). */
export type GoalPick = GoalId | "none" | null

export type ReviewFilter = {
  readonly goal: GoalPick
  /** `null` is every standing. */
  readonly standing: HoldStanding | null
}

export const EVERY_CHANGE: ReviewFilter = { goal: null, standing: null }

/** What a row needs for the filters to place it. */
export type Filterable = {
  readonly goalId: GoalId | null
  /** The goal's name as the change recorded it, for a goal removed since. */
  readonly goal: string | null
  readonly standing: HoldStanding
}

/** One choice in a filter: what it says, how many it would show, where it goes. */
export type FilterChoice = {
  readonly label: string
  readonly count: number
  readonly href: string
  readonly selected: boolean
}

/** In the order a change can fall behind its page. */
const STANDINGS = ["current", "stale", "conflicts"] as const satisfies readonly HoldStanding[]

const standingOf = (asked: string | undefined): HoldStanding | null =>
  STANDINGS.find((standing) => standing === asked) ?? null

const goalOf = (asked: string | undefined): GoalPick => {
  if (asked === "none") return "none"

  const parsed = goalIdSchema.safeParse(asked)

  return parsed.success ? parsed.data : null
}

/** The filter the address asks for; anything it cannot read is no filter. */
export const reviewFilterOf = (query: {
  readonly goal: string | undefined
  readonly standing: string | undefined
}): ReviewFilter => ({ goal: goalOf(query.goal), standing: standingOf(query.standing) })

/**
 * The address of *For review* with this filter, carrying only what narrows it,
 * and the change whose drawer is open (`?change=`) where one is.
 */
export const reviewHrefOf = (projectId: string, filter: ReviewFilter, change?: string): string => {
  const query = new URLSearchParams([
    ...(filter.goal === null ? [] : [["goal", filter.goal]]),
    ...(filter.standing === null ? [] : [["standing", filter.standing]]),
    ...(change === undefined ? [] : [["change", change]]),
  ])
  const search = query.toString()

  return `/portal/${projectId}/review${search === "" ? "" : `?${search}`}`
}

const onGoal = (row: Filterable, goal: GoalPick): boolean =>
  goal === null || (goal === "none" ? row.goalId === null : row.goalId === goal)

const onStanding = (row: Filterable, standing: HoldStanding | null): boolean =>
  standing === null || row.standing === standing

/** The rows the filter keeps, in the order given. */
export const filteredRows = <TRow extends Filterable>(
  rows: readonly TRow[],
  filter: ReviewFilter
): readonly TRow[] =>
  rows.filter((row) => onGoal(row, filter.goal) && onStanding(row, filter.standing))

/**
 * The goal picker: every goal, the changes no goal is named on where there are
 * any, and before them all of them.
 *
 * The project's goals come first, primary first, by their names now, each
 * whether or not anything waits for it, so the picker says *nothing waits for
 * this goal* rather than hiding the goal. A change raised for a goal removed
 * since is still picked out, by the name it recorded.
 */
export const goalChoicesOf = (
  rows: readonly Filterable[],
  goals: readonly Goal[],
  filter: ReviewFilter,
  projectId: string
): readonly FilterChoice[] => {
  const counted = rows.filter((row) => onStanding(row, filter.standing))
  const choice = (label: string, goal: GoalPick): FilterChoice => ({
    label,
    count: counted.filter((row) => onGoal(row, goal)).length,
    href: reviewHrefOf(projectId, { ...filter, goal }),
    selected: filter.goal === goal,
  })
  const kept = new Set<string>(goals.map((goal) => goal.goalId))
  const removed = new Map(
    rows.flatMap((row) =>
      row.goalId === null || kept.has(row.goalId) ? [] : [[row.goalId, row.goal ?? row.goalId]]
    )
  )
  const unnamed = rows.some((row) => row.goalId === null) || filter.goal === "none"

  return [
    choice("All goals", null),
    ...goals.map((goal) => choice(goal.name, goal.goalId)),
    ...[...removed].map(([goalId, name]) => choice(`${name} (removed)`, goalId)),
    ...(unnamed ? [choice("No goal named", "none")] : []),
  ]
}

/** The standing chips: *All*, then each standing. */
export const standingChoicesOf = (
  rows: readonly Filterable[],
  filter: ReviewFilter,
  projectId: string
): readonly FilterChoice[] => {
  const counted = rows.filter((row) => onGoal(row, filter.goal))
  const choice = (label: string, standing: HoldStanding | null): FilterChoice => ({
    label,
    count: counted.filter((row) => onStanding(row, standing)).length,
    href: reviewHrefOf(projectId, { ...filter, standing }),
    selected: filter.standing === standing,
  })

  return [
    choice("All", null),
    ...STANDINGS.map((standing) => choice(HOLD_STANDINGS[standing].label, standing)),
  ]
}
