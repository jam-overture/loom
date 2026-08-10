import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { buildIntent, collectingEventSink, failingEventSink, fixedClock } from "../testing/doubles.js"

import type { Clock, EventSink, RuntimeEvent } from "./events.js"
import { narrator } from "./narration.js"

const spare = sequentialIdFactory("narr")
const treeId = treeIdSchema.parse("t_narration")

const anEvent = (): RuntimeEvent => ({
  type: "intent-received",
  intent: buildIntent(spare, { treeId, baseRevision: 0 }),
})

const anotherEvent = (): RuntimeEvent => ({
  type: "proposal-held",
  proposalId: spare.proposalId(),
})

describe("narrator", () => {
  it("stamps the tree and the instant onto the event it is given", () => {
    const events = collectingEventSink()
    const event = anEvent()

    narrator(events, fixedClock("2026-08-07T09:00:00.000Z"), treeId)(event)

    expect(events.envelopes).toHaveLength(1)
    expect(events.envelopes[0]).toEqual({
      treeId,
      occurredAt: "2026-08-07T09:00:00.000Z",
      event,
    })
  })

  it("reads the clock once per event rather than once per narrator", () => {
    const instants = ["2026-08-07T09:00:00.000Z", "2026-08-07T09:00:01.000Z"]
    let read = 0
    const clock: Clock = { now: () => instants[read++] ?? "" }

    const events = collectingEventSink()
    const narrate = narrator(events, clock, treeId)
    narrate(anEvent())
    narrate(anotherEvent())

    expect(events.envelopes.map((envelope) => envelope.occurredAt)).toEqual(instants)
  })

  describe("containment", () => {
    it("does not rethrow what a sink throws", () => {
      const events = failingEventSink(["intent-received"])

      expect(() => narrator(events, fixedClock(), treeId)(anEvent())).not.toThrow()
    })

    /**
     * The half that matters more than the first: a sink that fails once must not
     * cost the events after it, or a single bad event silently truncates the
     * narration of everything that follows.
     */
    it("keeps narrating after a sink refuses one event", () => {
      const events = failingEventSink(["intent-received"])
      const narrate = narrator(events, fixedClock(), treeId)

      narrate(anEvent())
      narrate(anotherEvent())

      expect(events.types()).toEqual(["proposal-held"])
    })

    it("contains a sink that rejects instead of throwing", async () => {
      const events = failingEventSink(["intent-received"], "reject")

      expect(() => narrator(events, fixedClock(), treeId)(anEvent())).not.toThrow()

      /** An unhandled rejection would surface on the next turn of the loop. */
      await Promise.resolve()
      await Promise.resolve()
    })

    /**
     * A sink is free to be async and succeed; containment attaches a handler
     * without waiting for it, because waiting is the thing 0024 forbids.
     */
    it("does not await a sink that returns a promise", () => {
      const seen: string[] = []
      let settle: (() => void) | undefined
      const events: EventSink = {
        emit: (envelope) =>
          new Promise<void>((resolve) => {
            settle = () => {
              seen.push(envelope.event.type)
              resolve()
            }
          }) as unknown as void,
      }

      narrator(events, fixedClock(), treeId)(anEvent())

      expect(seen).toEqual([])
      expect(settle).toBeDefined()
    })

    /**
     * The deliberate limit of the containment: a clock that cannot answer is not
     * a broken observer, it is a runtime that cannot say when anything happened
     * — and the same clock stamps `appliedAt` on the commit.
     */
    it("does not contain a clock that throws", () => {
      const events = collectingEventSink()
      const clock: Clock = {
        now: () => {
          throw new Error("no clock")
        },
      }

      expect(() => narrator(events, clock, treeId)(anEvent())).toThrow("no clock")
      expect(events.envelopes).toHaveLength(0)
    })
  })
})
