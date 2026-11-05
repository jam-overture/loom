import { walkTree, type LoomTree } from "@jam-overture/loom"
import type { StoredPageViews, StoredTally } from "@jam-overture/loom/signals"

import type { PublishedPage } from "@/app/_lib/pages/published"

import { pageNameOf } from "../page-name"
import { partNameOf, type PartName } from "../part-name"
import { GOAL_KIND_WORDS } from "../vocabulary"
import type { Goal, GoalKind, PartsByPage } from "./goal"

/**
 * What the *Goals* screen says about each goal (0350), read from what the
 * site published and the tallies already kept. Pure.
 *
 * **Every figure is since counting began**, as on *Signals · By page*: the
 * tallies keep no time, so the wireframes' *7-day rate* and its trend wait on
 * the events kept for 30 days (0349). What is shown instead is the count and
 * the page views it happened in, which the tallies hold exactly.
 */

/** One part a goal may be built on, named as a person reads it. */
export type PartChoice = PartName

/** One published page and the parts on it a goal may name. */
export type PageChoice = {
  readonly treeId: string
  /** The heading the page gives itself, `undefined` where it has none. */
  readonly name: string | undefined
  readonly parts: readonly PartChoice[]
}

/**
 * The parts of a page a reader can do something to: its elements, which are
 * what a signal is filed against. Text and slots are inside one, never it.
 */
const partsOf = (tree: LoomTree): readonly PartChoice[] =>
  Array.from(walkTree(tree.root))
    .filter((node) => node.kind === "element" && node.id !== tree.root.id)
    .map(partNameOf)

/** Every published page with its parts, by its name and then its id. */
export const pageChoicesOf = (published: readonly PublishedPage[]): readonly PageChoice[] =>
  published
    .map(({ tree }): PageChoice => {
      const heading = pageNameOf(tree)

      return {
        treeId: tree.treeId,
        name: heading.derived ? heading.name : undefined,
        parts: partsOf(tree),
      }
    })
    .sort(
      (left, right) =>
        (left.name ?? left.treeId).localeCompare(right.name ?? right.treeId) ||
        left.treeId.localeCompare(right.treeId)
    )

/** Which parts each published page has, for `readGoalForm` to check a choice against. */
export const partsByPageOf = (pages: readonly PageChoice[]): PartsByPage =>
  new Map(pages.map((page) => [page.treeId, new Set(page.parts.map((part) => part.nodeId))]))

/** The counter on a tally that a goal's kind adds up. */
const counted: Readonly<Record<GoalKind, (tally: StoredTally) => number>> = {
  activated: (tally) => tally.activations,
  completed: (tally) => tally.completions,
  disclosed: (tally) => tally.opens,
}

export type GoalReading = {
  /** Times readers did it, on the pages it covers, across every version. */
  readonly count: number
  /** Page views of the pages it covers. */
  readonly pageViews: number
}

/**
 * What one goal has counted.
 *
 * The pages a goal covers are the ones it names, or, for *all pages*, every
 * page that has the part: as published, or as counted where a version the site
 * no longer publishes had it. Page views of a page without the part would be
 * readers who could never have done it, and would sink the rate for nothing.
 */
export const goalReadingOf = (
  goal: Goal,
  readings: {
    readonly pageViews: readonly StoredPageViews[]
    readonly tallies: readonly StoredTally[]
    readonly parts: PartsByPage
  }
): GoalReading => {
  const onPart = readings.tallies.filter((tally) => tally.nodeId === goal.nodeId)
  const covered = new Set<string>(
    goal.pages ?? [
      ...[...readings.parts.entries()]
        .filter(([, parts]) => parts.has(goal.nodeId))
        .map(([treeId]) => treeId),
      ...onPart.map((tally) => tally.treeId),
    ]
  )

  return {
    count: onPart
      .filter((tally) => covered.has(tally.treeId))
      .reduce((sum, tally) => sum + counted[goal.kind](tally), 0),
    pageViews: readings.pageViews
      .filter((row) => covered.has(row.treeId))
      .reduce((sum, row) => sum + row.opened, 0),
  }
}

const number = (value: number): string => value.toLocaleString("en-GB")

/** *12 presses in 480 page views*, and how many that is per hundred. */
export const readingSentence = (kind: GoalKind, reading: GoalReading): string => {
  if (reading.pageViews === 0) return "Nothing counted yet on the pages it covers."

  const words = GOAL_KIND_WORDS[kind]
  const per100 = Math.round((reading.count / reading.pageViews) * 1000) / 10

  return (
    `${number(reading.count)} ${reading.count === 1 ? words.one : words.many} in ` +
    `${number(reading.pageViews)} page ${reading.pageViews === 1 ? "view" : "views"}, ` +
    `${per100.toLocaleString("en-GB")} per 100.`
  )
}

/** *A reader presses the button “Start”*, by the part's name where the site published it. */
export const countsWhen = (goal: Goal, pages: readonly PageChoice[]): string => {
  const part = pages.flatMap((page) => page.parts).find((each) => each.nodeId === goal.nodeId)

  return `A reader ${GOAL_KIND_WORDS[goal.kind].does} ${part?.name ?? "a part no published page has any more"}`
}

/** *All pages with it*, or the pages chosen by name. */
export const whereSentence = (goal: Goal, pages: readonly PageChoice[]): string => {
  if (goal.pages === null) return "Every page that has it"

  const names = goal.pages.map(
    (treeId) => pages.find((page) => page.treeId === treeId)?.name ?? treeId
  )

  return names.join(", ")
}
