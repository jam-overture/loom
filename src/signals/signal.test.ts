import { describe, expect, it } from "vitest"

import {
  DELEGATED_READER_SIGNAL_KINDS,
  parseReaderSignalBatch,
  READER_SIGNAL_KINDS,
  readerSignalSchema,
} from "./signal.js"

const batch = (signals: readonly unknown[], extra: Record<string, unknown> = {}) => ({
  treeId: "t_1",
  revision: 3,
  sentAt: 1_700_000_000_000,
  signals,
  ...extra,
})

const at = 1_700_000_000_000

describe("parseReaderSignalBatch", () => {
  it("reads one of each kind", () => {
    const parsed = parseReaderSignalBatch(
      batch([
        { kind: "viewed", nodeId: "n_1", type: "loom.section", at },
        { kind: "dwelled", nodeId: "n_1", type: "loom.section", ms: 4200 },
        { kind: "activated", nodeId: "n_2", type: "loom.card", at },
        { kind: "disclosed", nodeId: "n_3", type: "loom.faq", open: true, at },
      ])
    )

    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.signals.map((signal) => signal.kind)).toEqual([...READER_SIGNAL_KINDS])
  })

  it("refuses a kind the vocabulary does not have", () => {
    const parsed = parseReaderSignalBatch(batch([{ kind: "hovered", nodeId: "n_1", type: "loom.card", at }]))

    expect(parsed.ok).toBe(false)
  })

  it("refuses content riding along on a signal — a signal names a node, never what it said", () => {
    const parsed = parseReaderSignalBatch(
      batch([{ kind: "activated", nodeId: "n_2", type: "loom.link", at, href: "https://example.com" }])
    )

    expect(parsed.ok).toBe(false)
  })

  it("refuses a batch with no revision, because a node id without one stops meaning anything after a change", () => {
    const { revision: _revision, ...withoutRevision } = batch([
      { kind: "viewed", nodeId: "n_1", type: "loom.section", at },
    ])

    expect(parseReaderSignalBatch(withoutRevision).ok).toBe(false)
  })

  it("refuses an empty batch and a dwell of no time", () => {
    expect(parseReaderSignalBatch(batch([])).ok).toBe(false)
    expect(
      parseReaderSignalBatch(batch([{ kind: "dwelled", nodeId: "n_1", type: "loom.section", ms: 0 }])).ok
    ).toBe(false)
  })

  const region = { nodeId: "n_9", type: "loom.section" }

  it("reads the regions a press says it happened inside", () => {
    const parsed = parseReaderSignalBatch(
      batch([{ kind: "activated", nodeId: "n_2", type: "loom.card", at, within: [region] }])
    )

    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.signals[0]).toMatchObject({ within: [region] })
  })

  it("tells an ancestry nobody walked for apart from one that found nothing", () => {
    const absent = parseReaderSignalBatch(batch([{ kind: "activated", nodeId: "n_2", type: "loom.card", at }]))
    const empty = parseReaderSignalBatch(
      batch([{ kind: "activated", nodeId: "n_2", type: "loom.card", at, within: [] }])
    )

    expect(absent.ok && empty.ok).toBe(true)
    if (absent.ok) expect(absent.value.signals[0]).not.toHaveProperty("within")
    if (empty.ok) expect(empty.value.signals[0]).toMatchObject({ within: [] })
  })

  /** A region is a node and a type. Anything else riding along is content, and 0136 says no. */
  it("refuses a region carrying more than an address", () => {
    const parsed = parseReaderSignalBatch(
      batch([
        { kind: "activated", nodeId: "n_2", type: "loom.card", at, within: [{ ...region, heading: "Pricing" }] },
      ])
    )

    expect(parsed.ok).toBe(false)
  })

  it("refuses an ancestry on a kind that is observed rather than delegated", () => {
    const parsed = parseReaderSignalBatch(
      batch([{ kind: "viewed", nodeId: "n_1", type: "loom.section", at, within: [region] }])
    )

    expect(parsed.ok).toBe(false)
  })

  /**
   * The list and the union, held against each other rather than kept in step by
   * hand. A kind that gains an ancestry and is not named in `kinds.ts` fails
   * here, which is the only place that could notice.
   */
  it("names exactly the kinds that carry an ancestry", () => {
    const carrying = readerSignalSchema.options
      .filter((option) => "within" in option.shape)
      .map((option) => option.shape.kind.value)

    expect([...carrying].sort()).toEqual([...DELEGATED_READER_SIGNAL_KINDS].sort())
  })

  it("says where a batch went wrong instead of throwing", () => {
    const parsed = parseReaderSignalBatch("not a batch")

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe("invalid-batch")
  })
})
