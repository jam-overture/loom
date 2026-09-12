import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"

import { drain, emptyLedger, entered, hid, left, showed, type SignalAddress } from "./ledger.js"

const address = (id: string, type = "loom.section"): SignalAddress => ({
  nodeId: nodeIdSchema.parse(id),
  type: primitiveTypeSchema.parse(type),
})

const goggles = address("n_4")

const dwellOf = (signals: ReturnType<typeof drain>["signals"]) =>
  signals.flatMap((signal) => (signal.kind === "dwelled" ? [signal.ms] : []))

describe("the signal ledger", () => {
  it("reports a node viewed once, however often it comes back", () => {
    let ledger = entered(emptyLedger(), goggles, 0)
    ledger = left(ledger, goggles.nodeId, 1000)
    ledger = entered(ledger, goggles, 2000)

    const viewed = drain(ledger, 3000).signals.filter((signal) => signal.kind === "viewed")

    expect(viewed).toHaveLength(1)
  })

  it("adds up every stretch on screen", () => {
    let ledger = entered(emptyLedger(), goggles, 0)
    ledger = left(ledger, goggles.nodeId, 1000)
    ledger = entered(ledger, goggles, 5000)
    ledger = left(ledger, goggles.nodeId, 7500)

    expect(dwellOf(drain(ledger, 9000).signals)).toEqual([3500])
  })

  it("counts a node that stays on screen once per millisecond across batches, never twice", () => {
    const first = drain(entered(emptyLedger(), goggles, 0), 4000)
    const second = drain(first.ledger, 6500)

    expect(dwellOf(first.signals)).toEqual([4000])
    expect(dwellOf(second.signals)).toEqual([2500])
    expect(second.signals.some((signal) => signal.kind === "viewed")).toBe(false)
  })

  it("stops counting while the page is hidden, and resumes from when it is shown", () => {
    let ledger = entered(emptyLedger(), goggles, 0)
    ledger = hid(ledger, 1000)
    ledger = showed(ledger, 60_000)

    expect(dwellOf(drain(ledger, 61_000).signals)).toEqual([2000])
  })

  it("does not count a node that came on screen while the page was hidden until it is shown", () => {
    let ledger = entered(emptyLedger(true), goggles, 0)
    ledger = showed(ledger, 10_000)

    expect(dwellOf(drain(ledger, 10_500).signals)).toEqual([500])
  })

  it("does not call a node viewed while nobody can see the page, and does once someone can", () => {
    const hiddenTab = entered(emptyLedger(true), goggles, 0)
    const whileHidden = drain(hiddenTab, 5000)

    expect(whileHidden.signals).toEqual([])

    const shown = drain(showed(whileHidden.ledger, 8000), 8000)
    expect(shown.signals).toEqual([{ kind: "viewed", ...goggles, at: 8000 }])
  })

  it("has nothing to say about a node that was never on screen", () => {
    expect(drain(emptyLedger(), 5000).signals).toEqual([])
  })
})
