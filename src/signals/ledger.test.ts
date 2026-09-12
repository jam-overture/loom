import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"

import { createSignalLedger, type SignalAddress } from "./ledger.js"
import type { ReaderSignal } from "./signal.js"

const address = (id: string, type = "loom.section"): SignalAddress => ({
  nodeId: nodeIdSchema.parse(id),
  type: primitiveTypeSchema.parse(type),
})

const goggles = address("n_4")

const dwellOf = (signals: readonly ReaderSignal[]): readonly number[] =>
  signals.flatMap((signal) => (signal.kind === "dwelled" ? [signal.ms] : []))

describe("the signal ledger", () => {
  it("reports a node viewed once, however often it comes back", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.left(goggles.nodeId, 1000)
    ledger.entered(goggles, 2000)

    expect(ledger.drain(3000).filter((signal) => signal.kind === "viewed")).toHaveLength(1)
  })

  it("adds up every stretch on screen", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.left(goggles.nodeId, 1000)
    ledger.entered(goggles, 5000)
    ledger.left(goggles.nodeId, 7500)

    expect(dwellOf(ledger.drain(9000))).toEqual([3500])
  })

  it("counts a node that stays on screen once per millisecond across batches, never twice", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)

    const first = ledger.drain(4000)
    const second = ledger.drain(6500)

    expect(dwellOf(first)).toEqual([4000])
    expect(dwellOf(second)).toEqual([2500])
    expect(second.some((signal) => signal.kind === "viewed")).toBe(false)
  })

  it("stops counting while the page is hidden, and resumes from when it is shown", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.hid(1000)
    ledger.showed(60_000)

    expect(dwellOf(ledger.drain(61_000))).toEqual([2000])
  })

  it("does not count a node that came on screen while the page was hidden until it is shown", () => {
    const ledger = createSignalLedger(true)
    ledger.entered(goggles, 0)
    ledger.showed(10_000)

    expect(dwellOf(ledger.drain(10_500))).toEqual([500])
  })

  it("does not call a node viewed while nobody can see the page, and does once someone can", () => {
    const ledger = createSignalLedger(true)
    ledger.entered(goggles, 0)

    expect(ledger.drain(5000)).toEqual([])

    ledger.showed(8000)
    expect(ledger.drain(8000)).toEqual([{ kind: "viewed", ...goggles, at: 8000 }])
  })

  it("has nothing to say about a node that was never on screen", () => {
    expect(createSignalLedger().drain(5000)).toEqual([])
  })

  it("returns what it was told a reader did, in order, and then forgets it", () => {
    const ledger = createSignalLedger()
    const first: ReaderSignal = { kind: "activated", ...address("n_7", "loom.link"), at: 1 }
    const second: ReaderSignal = { kind: "disclosed", ...address("n_8", "loom.faq"), open: true, at: 2 }
    ledger.noted(first)
    ledger.noted(second)

    expect(ledger.drain(3)).toEqual([first, second])
    expect(ledger.drain(4)).toEqual([])
  })

  it("costs the same per node on a large page as on a small one", () => {
    const scroll = (count: number): number => {
      const ledger = createSignalLedger()
      const nodes = Array.from({ length: count }, (_unused, index) => address(`n_${index.toString(36)}`))
      const started = performance.now()
      nodes.forEach((node, index) => {
        ledger.entered(node, index)
        const behind = nodes[index - 20]
        if (behind !== undefined) ledger.left(behind.nodeId, index)
        if (index % 250 === 0) ledger.drain(index)
      })
      ledger.drain(count)
      return (performance.now() - started) / count
    }

    scroll(2_000)
    const small = scroll(2_000)
    const large = scroll(32_000)

    /**
     * Linear work gives a ratio near 1; the bound is loose so a busy machine does
     * not fail it. The copying ledger this replaced grew with the square of the
     * page, which at sixteen times the nodes is far past it.
     */
    expect(large / small).toBeLessThan(4)
  })
})
