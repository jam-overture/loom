import { describe, expect, it } from "vitest"

import {
  activated,
  activatedIn,
  batchOf,
  completed,
  completedIn,
  disclosedIn,
  dwelled,
  nodeId,
  primitiveType,
  viewed,
} from "../testing/reader-signal-contract.js"

import { EMPTY_READINGS, foldReaderSignals, nodeReadingsOf, readingsOf } from "./fold.js"

const disclosed = (name: string, open: boolean) =>
  ({
    kind: "disclosed",
    nodeId: nodeId(name),
    type: primitiveType("loom.faq"),
    open,
    at: 1_000,
  }) as const

describe("foldReaderSignals", () => {
  it("reads an empty fold as nothing having happened", () => {
    expect(readingsOf([])).toEqual(EMPTY_READINGS)
  })

  it("sums time on screen across batches, because dwelled is per-batch", () => {
    const readings = readingsOf([
      batchOf([dwelled("hero", 400)]),
      batchOf([dwelled("hero", 350)]),
      batchOf([dwelled("hero", 12)]),
    ])

    expect(readings.dwellMs[nodeId("hero")]).toBe(762)
  })

  it("records a node as reached once, however often it is viewed", () => {
    const readings = readingsOf([batchOf([viewed("hero")]), batchOf([viewed("hero")])])

    expect(readings.reached[nodeId("hero")]).toBe(true)
  })

  it("counts activations rather than flagging them", () => {
    const readings = readingsOf([batchOf([activated("buy"), activated("buy")])])

    expect(readings.activations[nodeId("buy")]).toBe(2)
  })

  it("keeps opening and closing a region apart", () => {
    const readings = readingsOf([batchOf([disclosed("q", true), disclosed("q", false), disclosed("q", true)])])

    expect(readings.opens[nodeId("q")]).toBe(2)
    expect(readings.closes[nodeId("q")]).toBe(1)
  })

  it("learns each node's type from the signals rather than needing the tree", () => {
    const readings = readingsOf([batchOf([viewed("hero"), activated("buy")])])

    expect(readings.types[nodeId("buy")]).toBe(primitiveType("loom.button"))
  })

  it("counts the batches and the signals it was given", () => {
    const readings = readingsOf([batchOf([viewed("a"), viewed("b")]), batchOf([viewed("c")])])

    expect(readings).toMatchObject({ batches: 2, signals: 3 })
  })

  it("leaves the readings it was handed untouched", () => {
    const before = readingsOf([batchOf([dwelled("hero", 100)])])
    const snapshot = structuredClone(before)

    foldReaderSignals(before, batchOf([dwelled("hero", 900)]))

    expect(before).toEqual(snapshot)
  })

  /**
   * A node a reader never scrolled to has no signals at all, so it is absent
   * rather than zero. Readings say what was observed; what a page contains is
   * the tree's to say.
   */
  it("says nothing about a node no signal mentioned", () => {
    const readings = readingsOf([batchOf([viewed("hero")])])

    expect(readings.types[nodeId("footer")]).toBeUndefined()
    expect(nodeReadingsOf(readings).map((row) => row.nodeId)).toEqual([nodeId("hero")])
  })
})

describe("engagements", () => {
  /**
   * The occurrence count, because a fold is one page view. How many *readers*
   * used something in a band is a question about many views, and it is
   * `ReaderTally.engaged`.
   */
  it("counts every use inside a region, however many the reader made", () => {
    const readings = readingsOf([
      batchOf([activatedIn("buy", "pricing", "page"), activatedIn("compare", "pricing", "page")]),
      batchOf([disclosedIn("terms", true, "pricing", "page")]),
    ])

    expect(readings.engagements[nodeId("pricing")]).toBe(3)
    expect(readings.engagements[nodeId("page")]).toBe(3)
  })

  it("never counts a control's own use as a use inside it", () => {
    const readings = readingsOf([batchOf([activatedIn("buy", "pricing")])])

    expect(readings.activations[nodeId("buy")]).toBe(1)
    expect(readings.engagements[nodeId("buy")]).toBeUndefined()
    expect(readings.activations[nodeId("pricing")]).toBeUndefined()
  })

  it("adds nothing for a signal whose sender did not walk", () => {
    const readings = readingsOf([batchOf([activated("buy")])])

    expect(readings.engagements).toEqual({})
  })
})

describe("completions", () => {
  it("counts each form the browser let go against the node the form is", () => {
    const readings = readingsOf([batchOf([completed("signup")]), batchOf([completed("signup")])])

    expect(readings.completions[nodeId("signup")]).toBe(2)
  })

  /**
   * A completion is a use of the band it was the end of, like every other
   * delegated kind — and never a use of itself.
   */
  it("credits the bands it was inside without crediting the form", () => {
    const readings = readingsOf([batchOf([completedIn("signup", "pricing", "page")])])

    expect(readings.engagements[nodeId("pricing")]).toBe(1)
    expect(readings.engagements[nodeId("page")]).toBe(1)
    expect(readings.engagements[nodeId("signup")]).toBeUndefined()
  })

  it("leaves a node nobody submitted out rather than at zero", () => {
    expect(readingsOf([batchOf([viewed("hero")])]).completions).toEqual({})
  })
})

describe("nodeReadingsOf", () => {
  it("puts the longest on screen first", () => {
    const rows = nodeReadingsOf(
      readingsOf([batchOf([dwelled("a", 10), dwelled("b", 900), dwelled("c", 200)])])
    )

    expect(rows.map((row) => row.nodeId)).toEqual([nodeId("b"), nodeId("c"), nodeId("a")])
  })

  it("fills in the counters a node has no signals for", () => {
    const [row] = nodeReadingsOf(readingsOf([batchOf([viewed("hero")])]))

    expect(row).toEqual({
      nodeId: nodeId("hero"),
      type: primitiveType("loom.section"),
      dwellMs: 0,
      reached: true,
      activations: 0,
      opens: 0,
      closes: 0,
      completions: 0,
      engagements: 0,
    })
  })

  it("gives a region a row and a type from an ancestry alone", () => {
    const rows = nodeReadingsOf(readingsOf([batchOf([activatedIn("buy", "pricing")])]))

    expect(rows.map((row) => row.nodeId)).toContain(nodeId("pricing"))
    expect(rows.find((row) => row.nodeId === nodeId("pricing"))).toMatchObject({
      type: primitiveType("loom.section"),
      engagements: 1,
      activations: 0,
      reached: false,
    })
  })

  it("includes a node that was activated but never reported as viewed", () => {
    const [row] = nodeReadingsOf(readingsOf([batchOf([activated("buy")])]))

    expect(row).toMatchObject({ nodeId: nodeId("buy"), reached: false, activations: 1 })
  })
})
