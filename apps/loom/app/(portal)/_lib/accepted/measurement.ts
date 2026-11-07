import type { NodeId, TreeId } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import {
  boundsOf,
  liveAtOf,
  type AcceptedChange,
  type Served,
} from "@/app/(portal)/_lib/going-live"
import type { GoalKind } from "@/app/(portal)/_lib/goals/goal"
import {
  measurementOf,
  spanOf,
  windowsOf,
  type Bounds,
  type Measurement,
} from "@/app/(portal)/_lib/measuring"
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

/**
 * One accepted change's before and after on the goal it served, from when it
 * went live, each side ending where the page changed again.
 */
export const readMeasurement = async (
  reading: Extract<AcceptedReading, { readonly kind: "read" }>,
  change: AcceptedChange,
  served: Served
): Promise<Measurement> => {
  const liveAt = liveAtOf(change, reading.reach)

  if (liveAt === undefined) return { kind: "not-live" }

  const goal = served.kind === "recorded" ? served.goal : null

  if (goal === null) return { kind: "no-goal", liveAt }

  return readSides(
    reading.application,
    change.pageId,
    goal,
    liveAt,
    boundsOf(
      change,
      liveAt,
      reading.changes,
      reading.copyStarts.get(change.pageId) ?? [],
      reading.reach
    )
  )
}
