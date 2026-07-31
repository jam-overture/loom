import { describe, expect, it } from "vitest"

import { portalTelemetry } from "./telemetry"
import { beginWrite } from "./write"

/**
 * The wiring, not the runtime: that a write begun by this app narrates into the
 * journal, and that the narration only lands when the write is finished. The
 * composition itself is §2's to test — this asserts the seam the portal owns.
 */
describe("beginWrite", () => {
  it("records what the runtime narrated, and only once the write finishes", async () => {
    const write = beginWrite()
    const treeId = "t_wiring"

    write.path.runtime.events.emit({
      treeId: treeId as never,
      occurredAt: new Date().toISOString(),
      event: { type: "hold-confirmed", proposalId: "p_wiring" as never },
    })

    const before = await portalTelemetry.read({ treeId: treeId as never })
    expect(before.ok && before.value.records).toHaveLength(0)

    await write.finish()

    const after = await portalTelemetry.read({ treeId: treeId as never })
    expect(after.ok && after.value.records.map((record) => record.event.type)).toEqual([
      "hold-confirmed",
    ])
  })

  it("gives each write its own sink, so one request cannot flush another's", async () => {
    const first = beginWrite()
    const second = beginWrite()

    expect(first.path.runtime.events).not.toBe(second.path.runtime.events)
    expect(first.path.store).toBe(second.path.store)
  })
})
