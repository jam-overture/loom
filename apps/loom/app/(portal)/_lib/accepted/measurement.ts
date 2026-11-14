import type { NodeId, TreeId } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import {
  boundsOf,
  liveAtOf,
  type AcceptedChange,
  type Served,
} from "@/app/(portal)/_lib/going-live"
import { holdingOf, heldUntilOf, type Holding } from "@/app/(portal)/_lib/holding"
import { chartRangeOf, dailyChartOf, type DailyChart } from "@/app/(portal)/_lib/daily-rate"
import type { GoalKind } from "@/app/(portal)/_lib/goals/goal"
import {
  measurementOf,
  spanOf,
  windowsOf,
  type Bounds,
  type Measurement,
} from "@/app/(portal)/_lib/measuring"
import type { Mark } from "@/app/(portal)/_lib/page-history"
import { boundedReaderTallyStore } from "@/app/_lib/app/bounded-store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import type { AcceptedReading } from "./reading"

/** What a page is measured on: the kind of thing readers did, and the part they did it to. */
export type MeasuredOn = { readonly kind: GoalKind; readonly nodeId: NodeId }

/**
 * A page's before and after on a goal around the moment it changed (8c), read
 * from the project's own hourly counters: page views of the page, what readers
 * did to the goal's part on it, and when the project first counted anything
 * readers did. One read of each over the widest span the two sides could take;
 * `measurementOf` narrows them.
 *
 * A counter that does not answer costs the figures alone: the screen around
 * them stands, and says they could not be read.
 */
export const readSides = async (
  application: ApplicationId,
  pageId: TreeId,
  on: MeasuredOn,
  changedAt: number,
  bounds: Bounds
): Promise<Extract<Measurement, { readonly kind: "unreadable" | "read" }>> => {
  const widest = windowsOf(changedAt, bounds)
  const span = spanOf(widest)
  const tallies = boundedReaderTallyStore(readingsFor(application).tallies)
  const [arrivals, acted, anything] = await Promise.all([
    tallies.arrivals({ treeId: pageId, ...span }),
    tallies.acted({ treeId: pageId, nodeId: on.nodeId, ...span }),
    tallies.acted({ from: span.from, to: span.from }),
  ])

  if (!arrivals.ok || !acted.ok || !anything.ok) return { kind: "unreadable", windows: widest }

  return measurementOf(changedAt, bounds, on.kind, {
    arrivals: arrivals.value,
    acted: acted.value,
    actedBegins: anything.value.begins,
  })
}

type Read = Extract<AcceptedReading, { readonly kind: "read" }>

/**
 * Whether returning readers were kept on the page as it was after an accepted
 * change went live, and until when (0383): nobody for a change no reader has
 * been given. The hold ends early at the first copy started of any of the
 * project's pages, or the first change taken back going live, after it.
 */
export const holdingFor = (reading: Read, change: AcceptedChange): Holding => {
  const liveAt = liveAtOf(change, reading.reach)

  if (liveAt === undefined) return { kind: "none" }

  return holdingOf(liveAt, reading.window, {
    newerVersions: [...reading.copyStarts.values()].flat(),
    takenBack: reading.changes.flatMap((other) => {
      const at = other.undoes === undefined ? undefined : liveAtOf(other, reading.reach)

      return at === undefined ? [] : [at]
    }),
  })
}

/**
 * One accepted change's before and after on the goal it served, from when it
 * went live, each side ending where the page changed again. Where returning
 * readers were held on the page as it was, the after side starts once they
 * stopped being (0383 clause 6).
 */
export const readMeasurement = async (
  reading: Read,
  change: AcceptedChange,
  served: Served
): Promise<Measurement> => {
  const liveAt = liveAtOf(change, reading.reach)

  if (liveAt === undefined) return { kind: "not-live" }

  const goal = served.kind === "recorded" ? served.goal : null

  if (goal === null) return { kind: "no-goal", liveAt }

  const heldUntil = heldUntilOf(holdingFor(reading, change))

  return readSides(reading.application, change.pageId, goal, liveAt, {
    ...boundsOf(
      change,
      liveAt,
      reading.changes,
      reading.copyStarts.get(change.pageId) ?? [],
      reading.reach
    ),
    ...(heldUntil === undefined ? {} : { heldUntil }),
  })
}

/** The chart on a page's history, or why it could not be drawn. */
export type DailyChartReading =
  | { readonly kind: "read"; readonly chart: DailyChart }
  | { readonly kind: "unreadable" }

/**
 * A page's daily rate on a goal over the last 8 weeks, from the same hourly
 * counters a verdict reads: one read of each over the 8 weeks, and when the
 * project first counted anything readers did.
 */
export const readDailyChart = async (
  application: ApplicationId,
  pageId: TreeId,
  on: MeasuredOn & { readonly name: string },
  marks: readonly Mark[],
  now: number
): Promise<DailyChartReading> => {
  const range = chartRangeOf(now)
  const tallies = boundedReaderTallyStore(readingsFor(application).tallies)
  const [arrivals, acted, anything] = await Promise.all([
    tallies.arrivals({ treeId: pageId, ...range }),
    tallies.acted({ treeId: pageId, nodeId: on.nodeId, ...range }),
    tallies.acted({ from: range.from, to: range.from }),
  ])

  if (!arrivals.ok || !acted.ok || !anything.ok) return { kind: "unreadable" }

  return {
    kind: "read",
    chart: dailyChartOf({
      now,
      range,
      kind: on.kind,
      goal: on.name,
      marks,
      arrivals: arrivals.value,
      acted: acted.value,
      actedBegins: anything.value.begins,
    }),
  }
}
