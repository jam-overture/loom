import {
  boundsOf,
  liveAtOf,
  type AcceptedChange,
  type Served,
} from "@/app/(portal)/_lib/going-live"
import { measurementOf, spanOf, windowsOf, type Measurement } from "@/app/(portal)/_lib/measuring"
import { boundedReaderTallyStore } from "@/app/_lib/app/bounded-store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import type { AcceptedReading } from "./reading"

/**
 * One accepted change's before and after on the goal it served (8c), read
 * from the project's own hourly counters: page views of the page, what readers
 * did to the goal's part on it, and when the project first counted anything
 * readers did. One read of each over the widest span the two sides could take;
 * `measurementOf` narrows them.
 *
 * A counter that does not answer costs the result alone: the timeline above it
 * stands, and says the figures could not be read.
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

  const bounds = boundsOf(
    change,
    liveAt,
    reading.changes,
    reading.copyStarts.get(change.pageId) ?? [],
    reading.reach
  )
  const widest = windowsOf(liveAt, bounds)
  const span = spanOf(widest)
  const tallies = boundedReaderTallyStore(readingsFor(reading.application).tallies)
  const [arrivals, acted, anything] = await Promise.all([
    tallies.arrivals({ treeId: change.pageId, ...span }),
    tallies.acted({ treeId: change.pageId, nodeId: goal.nodeId, ...span }),
    tallies.acted({ from: span.from, to: span.from }),
  ])

  if (!arrivals.ok || !acted.ok || !anything.ok) return { kind: "unreadable", windows: widest }

  return measurementOf(liveAt, bounds, goal.kind, {
    arrivals: arrivals.value,
    acted: acted.value,
    actedBegins: anything.value.begins,
  })
}
