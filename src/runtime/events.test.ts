import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { buildIntent } from "../testing/doubles.js"

import { noopEventSink, systemClock } from "./events.js"

const spare = sequentialIdFactory("ev")
const treeId = treeIdSchema.parse("t_events")

describe("systemClock", () => {
  it("reports an ISO-8601 instant", () => {
    expect(systemClock.now()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe("noopEventSink", () => {
  it("accepts an envelope and does nothing with it", () => {
    const intent = buildIntent(spare, { treeId, baseRevision: 0 })

    expect(() =>
      noopEventSink.emit({
        treeId,
        occurredAt: systemClock.now(),
        event: { type: "intent-received", intent },
      })
    ).not.toThrow()
  })
})
