import type { TreeId } from "@jam-overture/loom"

import { liveAtOf, statusOf, type AcceptedChange, type Reach } from "./going-live"
import {
  isShort,
  MEASURING_DAYS,
  sideSentence,
  soFarSentence,
  testLines,
  VERDICT_LABELS,
  verdictOf,
  verdictSentence,
  type Measurement,
} from "./measuring"
import { plainDay } from "./when"

/**
 * A page's versions, newest first, each with what it did to the page's goal
 * (8c of `docs/portal.md`; `docs/portal-wireframes.md`, *5 · Pages · History*).
 * Pure: the screen reads the records and the counters, and this says what
 * they come to.
 *
 * **A version starts when the page changed for its readers.** That is a change
 * accepted on it going live (unit 8, 0358), or the site publishing a newer
 * version of the page, which starts a new copy (0358 clause 6). A Loom change
 * gets the verdict its own timeline gives, by the maintainer's rules of 5
 * November (`measuring.ts`). Loom does not judge a change it did not make: the
 * site's own edit shows its before and after on the page's goal for context,
 * and says it is not a Loom change.
 */

/** A change accepted on the page, where it sits on the page's history. */
export type LoomVersion = {
  readonly kind: "loom"
  readonly change: AcceptedChange
  /** When it went live; `undefined` while no reader has been given it. */
  readonly liveAt: number | undefined
  /** Where it sits: when it went live, or else when it was accepted. */
  readonly at: number
}

/** One version of the page, from the moment it changed for its readers. */
export type Version = LoomVersion | { readonly kind: "site"; readonly at: number }

export type PageHistory = {
  /** Accepted, still on the page, and not given to any reader yet: the dashed cards on top, newest first. */
  readonly pending: readonly LoomVersion[]
  /** Every version since Loom first saw the page, newest first. */
  readonly versions: readonly Version[]
}

/** The key a version is listed by, the same on every read. */
export const keyOf = (version: Version): string =>
  version.kind === "loom" ? version.change.proposalId : `site-${version.at}`

/** Newest first; at the same moment a Loom change before a site version, then by key, so every read agrees. */
const newestFirst = (left: Version, right: Version): number =>
  right.at - left.at ||
  (left.kind === right.kind ? 0 : left.kind === "loom" ? -1 : 1) ||
  keyOf(right).localeCompare(keyOf(left))

/**
 * The page's history from the changes accepted on the project's pages and the
 * times the page's copies started after its first (each one the site's newer
 * version). Changes on other pages are not this page's.
 */
export const historyOf = (
  pageId: TreeId,
  changes: readonly AcceptedChange[],
  copyStarts: readonly number[],
  reach: Reach
): PageHistory => {
  const loom = changes
    .filter((change) => change.pageId === pageId)
    .map((change): LoomVersion => {
      const liveAt = liveAtOf(change, reach)

      return { kind: "loom", change, liveAt, at: liveAt ?? change.acceptedAt }
    })
  const waiting = (version: LoomVersion): boolean =>
    version.liveAt === undefined && version.change.ending.kind === "standing"
  const site: readonly Version[] = copyStarts.map((at) => ({ kind: "site", at }))

  return {
    pending: loom.filter(waiting).sort(newestFirst),
    versions: [...loom.filter((version) => !waiting(version)), ...site].sort(newestFirst),
  }
}

/** A moment the page changed for its readers, and the version it started. */
export type Mark = {
  readonly at: number
  readonly origin: "loom" | "site"
  readonly label: string
}

/**
 * The moments the page changed that the chart marks: a Loom change from when
 * it went live (one never given to a reader never changed the page), and each
 * newer version of the site's page.
 */
export const marksOf = (versions: readonly Version[]): readonly Mark[] =>
  versions
    .flatMap((version): readonly Mark[] => {
      if (version.kind === "site") {
        return [{ at: version.at, origin: "site", label: "Your site's version" }]
      }

      return version.liveAt === undefined
        ? []
        : [
            {
              at: version.liveAt,
              origin: "loom",
              label: `Version ${version.change.accepted.revision}`,
            },
          ]
    })
    .sort((left, right) => left.at - right.at)

/** What a card says about the version's effect on the goal. */
export type Outcome = {
  /** The verdict, or the state that stands in for one: *Helped*, *Measuring*, *Not a Loom change*. */
  readonly label: string
  readonly tone: "good" | "bad" | "plain"
  readonly lines: readonly string[]
  /** How the verdict was reached, one click away. */
  readonly detail?: readonly string[]
}

const day = (at: number): string => plainDay(new Date(at).toISOString())

const SHORT_SIDE = `A side is shorter than ${MEASURING_DAYS} days where the page changed, or counting began, inside it: each version is measured on its own.`

const UNREADABLE: Omit<Outcome, "label"> = {
  tone: "plain",
  lines: [
    "Its figures could not be read. Nothing here is a statement about it; try again in a moment.",
  ],
}

/**
 * A Loom change's outcome: the verdict once its 14 days are over, the figures
 * so far while they run, and otherwise what stands in the way of a verdict.
 */
export const loomOutcomeOf = (
  change: AcceptedChange,
  reach: Reach,
  measurement: Measurement,
  now: number
): Outcome => {
  if (change.ending.kind !== "standing" || measurement.kind === "not-live") {
    const status = statusOf(change, reach)

    return { label: status.title, tone: "plain", lines: status.lines }
  }

  switch (measurement.kind) {
    case "no-goal":
      return {
        label: "Not measured",
        tone: "plain",
        lines: ["Loom has no goal recorded for this change, so there is nothing to measure it on."],
      }
    case "unreadable":
      return { label: "Figures could not be read", ...UNREADABLE }
    case "read": {
      const { before, after, goal, windows } = measurement

      if (now < windows.after.to) {
        return {
          label: "Measuring",
          tone: "plain",
          lines: [
            `It is measured until ${day(windows.after.to)}, ${MEASURING_DAYS} days after it went live.`,
            sideSentence("Before", before, goal),
            soFarSentence(after, goal),
          ],
        }
      }

      const verdict = verdictOf(before, after)

      return {
        label: VERDICT_LABELS[verdict.kind],
        tone: verdict.kind === "helped" ? "good" : verdict.kind === "hurt" ? "bad" : "plain",
        lines: [
          verdictSentence(verdict),
          sideSentence("Before", before, goal),
          sideSentence("After", after, goal),
          ...([before, after].some((side) => isShort(side.range)) ? [SHORT_SIDE] : []),
        ],
        detail: testLines(verdict),
      }
    }
  }
}

const NOT_LOOMS = "Not a Loom change"

const JUDGED = "Loom judges only the changes it made, so this one gets no verdict."

/** The figures around one of the site's own edits, on the goal on the page now. */
export type SiteFigures =
  | { readonly kind: "no-goal" }
  /** The goals, or the page they are matched against, could not be read. */
  | { readonly kind: "unreadable" }
  | {
      readonly kind: "measured"
      readonly goal: string
      readonly measurement: Extract<Measurement, { readonly kind: "unreadable" | "read" }>
    }

/** The site's own edit: its before and after on the page's goal, for context, and never a verdict. */
export const siteOutcomeOf = (figures: SiteFigures, now: number): Outcome => {
  switch (figures.kind) {
    case "no-goal":
      return {
        label: NOT_LOOMS,
        tone: "plain",
        lines: [JUDGED, "No goal is on this page, so there are no figures to show around it."],
      }
    case "unreadable":
      return { label: NOT_LOOMS, ...UNREADABLE }
    case "measured": {
      const { goal, measurement } = figures

      if (measurement.kind === "unreadable") return { label: NOT_LOOMS, ...UNREADABLE }

      const { before, after, windows } = measurement

      return {
        label: NOT_LOOMS,
        tone: "plain",
        lines: [
          `${JUDGED} For context, on ${goal}:`,
          sideSentence("Before", before, measurement.goal),
          now >= windows.after.to
            ? sideSentence("After", after, measurement.goal)
            : soFarSentence(after, measurement.goal),
        ],
      }
    }
  }
}

/**
 * Where a version came from, as the line under its heading says it: who said
 * yes, or, for a change a person asked for that needed no yes, who asked.
 */
export const originOf = (version: Version): string => {
  if (version.kind === "site") return `Your site's own edit · published ${day(version.at)}`

  const { accepted, undoes } = version.change
  const what = undoes === undefined ? "Loom change" : "Revert"
  const by = accepted.answeredBy
  const asker =
    accepted.provenance.origin === "user-instruction" ? accepted.provenance.actor : undefined
  const made =
    by !== undefined
      ? `${what}, accepted by ${by}`
      : asker !== undefined
        ? `${what}, asked for by ${asker} and made within the project's rules`
        : `${what}, made within the project's rules`

  return version.liveAt === undefined
    ? `${made} · accepted ${day(version.change.acceptedAt)}`
    : `${made} · live ${day(version.liveAt)}`
}

/**
 * A Loom change's heading and the lines under it. A revert is named by the
 * version it reverted, with what it put back under it; any other change by the
 * first sentence of what it did. Pure.
 */
export const versionWordsOf = (
  change: AcceptedChange,
  changes: readonly AcceptedChange[],
  sentences: readonly string[]
): { readonly heading: string; readonly lines: readonly string[] } => {
  const version = `Version ${change.accepted.revision}`
  const undone = changes.find((other) => other.proposalId === change.undoes)

  if (undone !== undefined) {
    return {
      heading: `${version}: reverted version ${undone.accepted.revision}`,
      lines: sentences,
    }
  }

  const [first = "A change Loom made", ...lines] = sentences

  return { heading: `${version}: ${first}`, lines }
}
