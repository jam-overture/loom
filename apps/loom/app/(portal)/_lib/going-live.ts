import type { IntentId, ProposalId, StakeLevel, TreeId } from "@jam-overture/loom"
import type { StoredRevision } from "@jam-overture/loom/store"

import type { GoalId } from "./goals/goal"
import type { ProposalGoal } from "./goals/serving"
import {
  isShort,
  MEASURING_DAYS,
  sideSentence,
  soFarSentence,
  testLines,
  VERDICT_LABELS,
  verdictOf,
  verdictSentence,
  type Bounds,
  type Measurement,
} from "./measuring"
import { firstNamed, namesInOperations, type PartName } from "./part-name"
import type { PageCopy } from "./proposing/copies"
import type { MadeFrom } from "./proposing/made-from"
import { pullingWords, type Pulling } from "./pulling"
import { changesOf } from "./revision-view"
import { STAKES, type PlainLine } from "./vocabulary"
import { plainDay } from "./when"

/**
 * Where a change someone accepted has got to, from *Accept* to its result
 * (unit 8, [0358](../../../../../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md);
 * `docs/portal-wireframes.md` section 4). Pure: the screen reads the records
 * and this says what they come to.
 *
 * **An accepted change is a change on the record of a page's copy.** The copy
 * is the live page (0358 clause 5), and when the site publishes a newer version
 * the copy starts again and each accepted change is applied to it again under
 * the same proposal id (clause 6). So one change can be on several copies'
 * records: it was accepted where it first appears, and it is still on the live
 * page only if it is on the current copy's record. One that is not was dropped
 * when the first copy without it started.
 */

/** One copy of a page and every change on its record, oldest first. */
export type CopyRecord = {
  readonly copy: PageCopy
  readonly revisions: readonly StoredRevision[]
}

/** How an accepted change stopped being on the live page, if it did. */
export type Ending =
  | { readonly kind: "standing" }
  /** Undone on the page's current copy, by the change that undid it. */
  | { readonly kind: "undone"; readonly at: number }
  /** It no longer fitted the site's newer version of the page (0358 clause 6). */
  | { readonly kind: "dropped"; readonly at: number }

export type AcceptedChange = {
  readonly proposalId: ProposalId
  readonly pageId: TreeId
  /** The entry as it was first made, on the copy it was accepted on. */
  readonly accepted: StoredRevision
  readonly acceptedAt: number
  readonly ending: Ending
}

type Appearance = { readonly revision: StoredRevision; readonly index: number }

const endingOf = (
  records: readonly CopyRecord[],
  proposalId: ProposalId,
  lastIndex: number
): Ending => {
  const current = records.at(-1)
  const after = records[lastIndex + 1]

  if (after !== undefined) return { kind: "dropped", at: after.copy.startedAt }

  const here = current?.revisions.find((revision) => revision.proposalId === proposalId)
  const undoing = current?.revisions.find(
    (revision) => here !== undefined && revision.provenance.undoes === here.revision
  )

  return undoing === undefined
    ? { kind: "standing" }
    : { kind: "undone", at: Date.parse(undoing.appliedAt) }
}

/**
 * Every change accepted on a page, newest first, from its copies' records,
 * oldest copy first.
 */
export const acceptedChangesOf = (
  pageId: TreeId,
  records: readonly CopyRecord[]
): readonly AcceptedChange[] => {
  const appearances: readonly Appearance[] = records.flatMap((record, index) =>
    record.revisions.map((revision) => ({ revision, index }))
  )
  const first = new Map(
    [...appearances].reverse().map((seen) => [seen.revision.proposalId, seen.revision] as const)
  )
  const last = new Map(appearances.map((seen) => [seen.revision.proposalId, seen.index] as const))

  return [...first.values()]
    .map((accepted) => ({
      proposalId: accepted.proposalId,
      pageId,
      accepted,
      acceptedAt: Date.parse(accepted.appliedAt),
      ending: endingOf(records, accepted.proposalId, last.get(accepted.proposalId) ?? 0),
    }))
    .sort(newestFirst)
}

/** Newest accepted first; the proposal id breaks a tie so the order is the same on every read. */
export const newestFirst = (left: AcceptedChange, right: AcceptedChange): number =>
  right.acceptedAt - left.acceptedAt || right.proposalId.localeCompare(left.proposalId)

/**
 * Whether a project's site takes accepted changes, and when it took each
 * answer it has taken since the oldest change on the screen.
 */
export type Reach =
  | { readonly kind: "own-site" }
  | { readonly kind: "unreadable" }
  | { readonly kind: "never" }
  | {
      readonly kind: "pulling"
      /** No pull for over an hour (`QUIET_AFTER_MS`). */
      readonly quiet: boolean
      /** When each answer was first taken, earliest first (`SitePullStore.firstTakenSince`). */
      readonly taken: readonly number[]
    }

export const reachOf = (
  pulling: Pulling,
  taken: { readonly ok: true; readonly value: readonly number[] } | { readonly ok: false }
): Reach => {
  if (pulling.kind !== "pulling") return { kind: pulling.kind }
  if (!taken.ok) return { kind: "unreadable" }

  return { kind: "pulling", quiet: pulling.quiet, taken: taken.value }
}

/** Where the change is between *Accept* and live. */
type Arrival =
  | { readonly kind: "live"; readonly at: number }
  /** It came off the page before any reader could have been given it. */
  | { readonly kind: "never-live" }
  | { readonly kind: "waiting"; readonly quiet: boolean }
  | { readonly kind: "not-pulling" }
  | { readonly kind: "unreadable" }

const endedAt = (ending: Ending): number =>
  ending.kind === "standing" ? Number.POSITIVE_INFINITY : ending.at

/**
 * When the change went live: at once for this deployment's own site, which
 * reads its pages from the store as it draws them (0259), and otherwise on the
 * site's first pull of a new answer after it was accepted, provided the change
 * was still on the page by then.
 */
const arrivalOf = (change: AcceptedChange, reach: Reach): Arrival => {
  const live = (at: number): Arrival =>
    at < endedAt(change.ending) ? { kind: "live", at } : { kind: "never-live" }

  switch (reach.kind) {
    case "own-site":
      return live(change.acceptedAt)
    case "unreadable":
      return change.ending.kind === "standing" ? { kind: "unreadable" } : { kind: "never-live" }
    case "never":
      return change.ending.kind === "standing" ? { kind: "not-pulling" } : { kind: "never-live" }
    case "pulling": {
      const at = reach.taken.find((taken) => taken >= change.acceptedAt)

      if (at !== undefined) return live(at)

      return change.ending.kind === "standing"
        ? { kind: "waiting", quiet: reach.quiet }
        : { kind: "never-live" }
    }
  }
}

/** When a change went live, or `undefined` while no reader has been given it. */
export const liveAtOf = (change: AcceptedChange, reach: Reach): number | undefined => {
  const arrival = arrivalOf(change, reach)

  return arrival.kind === "live" ? arrival.at : undefined
}

/**
 * Every time the page changed for its readers: a change accepted on it going
 * live, or the site's newer version of it starting a new copy (`copyStarts`).
 */
export const changedAtOf = (
  pageId: TreeId,
  changes: readonly AcceptedChange[],
  copyStarts: readonly number[],
  reach: Reach
): readonly number[] => [
  ...copyStarts,
  ...changes
    .filter((change) => change.pageId === pageId)
    .flatMap((change) => {
      const at = liveAtOf(change, reach)

      return at === undefined ? [] : [at]
    }),
]

/**
 * The page's last change before `at` and its first after, from every time it
 * changed. A change at `at` itself is neither: it is the one being measured.
 */
export const boundsAround = (at: number, changedAt: readonly number[]): Bounds => {
  const previous = changedAt.filter((other) => other < at)
  const next = changedAt.filter((other) => other > at)

  return {
    ...(previous.length === 0 ? {} : { previous: Math.max(...previous) }),
    ...(next.length === 0 ? {} : { next: Math.min(...next) }),
  }
}

/**
 * When the page changed around a change that went live at `liveAt`: another
 * change on the same page going live, or the site's newer version of it
 * starting a new copy (`copyStarts`). Each version is measured on its own.
 */
export const boundsOf = (
  change: AcceptedChange,
  liveAt: number,
  others: readonly AcceptedChange[],
  copyStarts: readonly number[],
  reach: Reach
): Bounds =>
  boundsAround(
    liveAt,
    changedAtOf(
      change.pageId,
      others.filter((other) => other.proposalId !== change.proposalId),
      copyStarts,
      reach
    )
  )

/** Done steps are green, the current one ringed, the rest grey, and an ending red. */
export type StepState = "done" | "current" | "upcoming" | "ended"

export type TimelineStep = {
  readonly title: string
  readonly state: StepState
  /** When the step happened, in epoch milliseconds; absent for a step not reached. */
  readonly at?: number
  readonly lines: readonly string[]
  /** The step a person can act on by connecting their site. */
  readonly connect?: true
  /** How the step's verdict was reached, one click away. */
  readonly detail?: readonly string[]
}

const iso = (at: number): string => new Date(at).toISOString()

const day = (at: number): string => plainDay(iso(at))

const acceptedStep = (change: AcceptedChange): TimelineStep => ({
  title: "Accepted",
  state: "done",
  at: change.acceptedAt,
  lines: [
    change.accepted.answeredBy === undefined
      ? "Loom checked it against the project's rules and made it on its copy of the page."
      : `${change.accepted.answeredBy} said yes to it, and Loom checked it against the project's rules again before making it on its copy of the page.`,
  ],
})

const LIVE_TITLE = "Live"

const liveStep = (arrival: Arrival, reach: Reach): TimelineStep => {
  switch (arrival.kind) {
    case "live":
      return {
        title: LIVE_TITLE,
        state: "done",
        at: arrival.at,
        lines: [
          reach.kind === "own-site"
            ? "This deployment's own site reads its pages from Loom as it draws them, so it was live at once."
            : "Your site's server took the page with this change on its first pull after it was accepted.",
        ],
      }
    case "never-live":
      return {
        title: "Never live",
        state: "upcoming",
        lines: ["It came off the page before your site took it, so no reader was given it."],
      }
    case "waiting":
      return {
        title: "Waiting for your site to pull",
        state: "current",
        lines: [
          arrival.quiet
            ? "Your site has not pulled for over an hour, so it may have stopped. The change is live from its next pull."
            : "Your site pulls its pages on its own schedule, and the change is live from its next pull.",
        ],
      }
    case "not-pulling":
      return {
        title: pullingWords({ kind: "never" }).title,
        state: "current",
        lines: pullingWords({ kind: "never" }).lines,
        connect: true,
      }
    case "unreadable":
      return {
        title: "Whether it is live could not be read",
        state: "current",
        lines: [
          "Nothing here is a statement about your site. If this stays, this deployment may not have the table that records pulls yet.",
        ],
      }
  }
}

const endingStep = (ending: Exclude<Ending, { kind: "standing" }>): TimelineStep =>
  ending.kind === "dropped"
    ? {
        title: "No longer fits the site's newer version",
        state: "ended",
        at: ending.at,
        lines: [
          "Your site published a newer version of the page and this change does not fit it, so it came off the live page. Loom may propose it again.",
        ],
      }
    : {
        title: "Undone",
        state: "ended",
        at: ending.at,
        lines: ["Someone undid it, so the page is back as it was before it."],
      }

const AGAINST = `against the ${MEASURING_DAYS} days before`

const onGoal = (goal: string | null): string => (goal === null ? "its goal" : `its goal, ${goal},`)

const resultStep = (measurement: Extract<Measurement, { kind: "read" }>): TimelineStep => {
  const verdict = verdictOf(measurement.before, measurement.after)
  const short = [measurement.before, measurement.after].some((side) => isShort(side.range))

  return {
    title: `Result: ${VERDICT_LABELS[verdict.kind]}`,
    state: "done",
    at: measurement.windows.after.to,
    lines: [
      verdictSentence(verdict),
      sideSentence("Before", measurement.before, measurement.goal),
      sideSentence("After", measurement.after, measurement.goal),
      ...(short
        ? [
            `A side is shorter than ${MEASURING_DAYS} days where the page changed, or counting began, inside it: each version is measured on its own.`,
          ]
        : []),
    ],
    detail: testLines(verdict),
  }
}

const measuringSteps = (
  measurement: Measurement,
  now: number,
  goal: string | null
): readonly TimelineStep[] => {
  switch (measurement.kind) {
    case "not-live":
      return [
        {
          title: "Measuring",
          state: "upcoming",
          lines: [
            `Once it is live, it is measured on ${onGoal(goal)} over the ${MEASURING_DAYS} days after, ${AGAINST}.`,
          ],
        },
        {
          title: "Result",
          state: "upcoming",
          lines: ["A verdict comes once it has been measured."],
        },
      ]
    case "no-goal":
      return [
        {
          title: "Not measured",
          state: "upcoming",
          at: measurement.liveAt,
          lines: [
            "Loom has no goal recorded for this change, so there is nothing to measure it on and no verdict to give.",
          ],
        },
      ]
    case "unreadable":
    case "read": {
      const { after } = measurement.windows
      const over = now >= after.to
      const measuring: TimelineStep = {
        title: "Measuring",
        state: over ? "done" : "current",
        at: after.from,
        lines: [
          `It ${over ? "was" : "is"} measured on ${onGoal(goal)} from ${day(after.from)} to ${day(after.to)}, ${AGAINST}.`,
        ],
      }

      if (measurement.kind === "unreadable") {
        return [
          measuring,
          {
            title: "Result",
            state: "upcoming",
            lines: [
              "Its figures could not be read. Nothing here is a statement about the change; try again in a moment.",
            ],
          },
        ]
      }

      return over
        ? [measuring, resultStep(measurement)]
        : [
            {
              ...measuring,
              lines: [...measuring.lines, soFarSentence(measurement.after, measurement.goal)],
            },
            {
              title: "Result",
              state: "upcoming",
              lines: [`A verdict comes once the ${MEASURING_DAYS} days end, on ${day(after.to)}.`],
            },
          ]
    }
  }
}

/**
 * The timeline: *Accepted* → *Live* → *Measuring* → *Result*, or ending where
 * the change came off the page. *Measuring* names the goal where it is known.
 */
export const timelineOf = (
  change: AcceptedChange,
  reach: Reach,
  now: number,
  served: Served,
  measurement: Measurement
): readonly TimelineStep[] => {
  const reached = [acceptedStep(change), liveStep(arrivalOf(change, reach), reach)]

  return change.ending.kind === "standing"
    ? [...reached, ...measuringSteps(measurement, now, goalNameOf(served))]
    : [...reached, endingStep(change.ending)]
}

/** Where a change has got to, as the step a list of changes names it by. */
export const statusOf = (change: AcceptedChange, reach: Reach): TimelineStep =>
  change.ending.kind === "standing"
    ? liveStep(arrivalOf(change, reach), reach)
    : endingStep(change.ending)

/**
 * What was kept of where a change came from, read for the changes on screen:
 * what each was made from by its proposal, and the goal each intent served.
 */
export type Origins =
  | {
      readonly kind: "read"
      readonly made: ReadonlyMap<ProposalId, MadeFrom>
      readonly goals: ReadonlyMap<IntentId, ProposalGoal>
    }
  | { readonly kind: "unreadable" }

/**
 * The goal a change served and the stake the Gate put on it, as the timeline
 * and the list say them (`docs/portal-wireframes.md` section 4: *the change as
 * a heading with its goal chip, and page · accepted by <who> on <date> ·
 * stake*).
 *
 * The goal is `null` for a change made from a proposal that named none (0352).
 * A change made before what it was made from was kept, or whose record could
 * not be written, is `not-recorded`: nothing can be said of its goal or stake.
 */
export type Served =
  | {
      readonly kind: "recorded"
      /** The goal as the proposal recorded it, so it is measured on what it was raised for. */
      readonly goal: ProposalGoal | null
      readonly stakes: StakeLevel
    }
  | { readonly kind: "not-recorded" }
  | { readonly kind: "unreadable" }

export const servedOf = (proposalId: ProposalId, origins: Origins): Served => {
  if (origins.kind === "unreadable") return { kind: "unreadable" }

  const made = origins.made.get(proposalId)

  if (made === undefined) return { kind: "not-recorded" }

  return {
    kind: "recorded",
    goal: origins.goals.get(made.intentId) ?? null,
    stakes: made.stakes,
  }
}

/** The name of the goal a change served, where one was recorded. */
export const goalNameOf = (served: Served): string | null =>
  served.kind === "recorded" ? (served.goal?.name ?? null) : null

/** The stake in the portal's words, for the line under the heading; absent where none was kept. */
export const stakeWordsOf = (served: Served): string | undefined =>
  served.kind === "recorded" ? STAKES[served.stakes].label : undefined

/** What the timeline says in place of a goal chip where none can be drawn. Pure. */
export const servedNoteOf = (served: Served): string | undefined => {
  switch (served.kind) {
    case "recorded":
      return undefined
    case "not-recorded":
      return "Loom has no record of the goal this change served or of its risk. Changes made before 7 November were not recorded with them."
    case "unreadable":
      return "The goal this change served could not be read. If this stays, this deployment may not have the table that records it yet."
  }
}

/**
 * How many of the accepted changes for each goal went live, for *changes for
 * it* on *Goals* (`docs/portal-wireframes.md` section 3: *2 waiting · 3
 * shipped*). A change counts once a reader could have been given it, and
 * stays counted if it is later undone or no longer fits the site's newer
 * version: it shipped. A change no goal was recorded for counts towards none.
 *
 * `undefined` where it cannot be said: when the site's pulls or the goals the
 * changes served could not be read, a count would be short rather than true.
 * Pure.
 */
export const shippedByGoalOf = (
  changes: readonly AcceptedChange[],
  reach: Reach,
  origins: Origins
): ReadonlyMap<GoalId, number> | undefined => {
  if (reach.kind === "unreadable" || origins.kind === "unreadable") return undefined

  return changes.reduce((counts, change) => {
    const served = servedOf(change.proposalId, origins)
    const goalId = served.kind === "recorded" ? served.goal?.goalId : undefined

    return goalId === undefined || liveAtOf(change, reach) === undefined
      ? counts
      : new Map(counts).set(goalId, (counts.get(goalId) ?? 0) + 1)
  }, new Map<GoalId, number>())
}

/** How many accepted changes a page of the list shows, as every list in the portal does. */
export const ACCEPTED_PAGE_SIZE = 50

/**
 * One page of the list, newest first: the changes after `before` (the last
 * one the previous page showed), and the change to carry on from when there
 * are older ones. A `before` the list does not hold starts from the newest.
 */
export const acceptedPage = (
  changes: readonly AcceptedChange[],
  before: string | undefined
): { readonly rows: readonly AcceptedChange[]; readonly older: ProposalId | undefined } => {
  const start = changes.findIndex((change) => change.proposalId === before) + 1
  const rows = changes.slice(start, start + ACCEPTED_PAGE_SIZE)

  return {
    rows,
    older: changes.length > start + ACCEPTED_PAGE_SIZE ? rows.at(-1)?.proposalId : undefined,
  }
}

/**
 * A sentence as a person reads it: a named part by its name alone, its id kept
 * for the change as Loom keeps it, one click down. A part nothing names keeps
 * its id, which is all there is to call it.
 */
const spoken = (line: PlainLine): string =>
  `${line.before}${typeof line.subject === "string" ? line.subject : line.subject.name}${line.after}`

/** What a change did, one plain sentence per part it touched, named where the page names it. */
export const sentencesOf = (
  change: AcceptedChange,
  parts: ReadonlyMap<TreeId, ReadonlyMap<string, PartName>>
): readonly string[] =>
  changesOf(
    change.accepted,
    firstNamed(
      parts.get(change.pageId) ?? new Map(),
      namesInOperations(change.accepted.delta.operations)
    )
  ).map(spoken)
