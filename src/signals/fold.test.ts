import { describe, expect, it } from "vitest"

import { batchOf, activated, dwelled, nodeId, primitiveType, viewed } from "../testing/reader-signal-contract.js"

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
    })
  })

  it("includes a node that was activated but never reported as viewed", () => {
    const [row] = nodeReadingsOf(readingsOf([batchOf([activated("buy")])]))

    expect(row).toMatchObject({ nodeId: nodeId("buy"), reached: false, activations: 1 })
  })
})
