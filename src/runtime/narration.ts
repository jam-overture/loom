import type { TreeId } from "../ids.js"

import type { Clock, EventSink, RuntimeEvent, RuntimeEventEnvelope } from "./events.js"

/**
 * The one door a runtime event leaves through.
 *
 * `EventSink` has promised since §2 that a sink cannot fail a change the Gate
 * already accepted. Until now that was an obligation on whoever implemented the
 * interface: the pipeline and the write path both called `emit` bare, so a sink
 * that threw took the change down with it — including, at `change-committed`,
 * a change already durable in the log, reported to the caller as an error.
 *
 * So the promise is kept here instead, once, where every event passes. A sink
 * is free to be a bad citizen; what it cannot be is load-bearing.
 */

export type Narrator = (event: RuntimeEvent) => void

const ignore = (): void => undefined

/**
 * `emit` is declared to return `void`, which does not stop a host from writing
 * an `async` one — TypeScript assigns `() => Promise<void>` to `() => void`
 * without complaint. Such a sink rejects instead of throwing, and an unhandled
 * rejection is a process-level failure on exactly the serverless hosts this
 * containment was written for (0024). It has to cover both shapes or it covers
 * neither.
 */
const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { readonly then?: unknown }).then === "function"

/**
 * Emits without letting the sink refuse. Nothing is reported when containment
 * fires, because the only channel for reporting it is the thing that just
 * failed, which is accepted rather than worked around (see 0042).
 */
const contain = (events: EventSink, envelope: RuntimeEventEnvelope): void => {
  try {
    const returned: unknown = events.emit(envelope)
    if (isThenable(returned)) returned.then(ignore, ignore)
  } catch {
    /** Contained on purpose. A sink observes; it does not get a vote. */
  }
}

/**
 * The clock is deliberately outside the containment. A sink that fails is a
 * broken observer and the change is still true; a clock that fails means the
 * runtime cannot say when anything happened, and it stamps `appliedAt` on the
 * commit itself, so pretending otherwise would put a wrong time in the log
 * rather than lose an event.
 */
export const narrator =
  (events: EventSink, clock: Clock, treeId: TreeId): Narrator =>
  (event) =>
    contain(events, { treeId, occurredAt: clock.now(), event })
