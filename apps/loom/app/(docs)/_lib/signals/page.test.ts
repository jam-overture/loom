import {
  READER_SIGNAL_KINDS,
  parseReaderSignalBatch,
  readerSignalBatchSchema,
} from "@loom/runtime/signals"
import { describe, expect, it } from "vitest"

import { produceAddressedMarkup } from "./markup"
import { produceBatch, produceKinds, produceReadBack } from "./page"

/**
 * What *What your readers do* shows, held against the runtime it claims to be
 * showing.
 *
 * The producers already refuse to print something the schema would reject, so
 * these are not re-checking the schema. They are checking the things a producer
 * cannot notice about itself: that the vocabulary it walked is the runtime's
 * whole vocabulary, that the addresses it prints belong to nodes on the page
 * above, that the page's central privacy claim is the parser's behaviour rather
 * than this repository's opinion, and that the markup comparison would fail if
 * addressing ever started doing more than it says.
 */

describe("the four kinds block", () => {
  it("covers the runtime's whole vocabulary, in its order", () => {
    expect(produceKinds().map((row) => row.kind)).toEqual([...READER_SIGNAL_KINDS])
  })

  it("gives every kind a sentence, a field and a real signal", () => {
    for (const row of produceKinds()) {
      expect(row.means.length, row.kind).toBeGreaterThan(20)
      expect(row.here.length, row.kind).toBeGreaterThan(20)
      expect(row.carries, row.kind).toContain("—")
      expect(JSON.parse(row.example), row.kind).toMatchObject({ kind: row.kind })
    }
  })

  /**
   * The address in every printed signal is a node that is really on the page.
   *
   * This is the failure 0136 exists to prevent — a signal filed against a
   * position rather than a node — and the one it would be most embarrassing for
   * its own guide to ship.
   */
  it("only names nodes the example tree actually has", () => {
    const batch = produceBatch()
    const ids = JSON.parse(batch.json) as { readonly signals: readonly { readonly nodeId: string }[] }

    for (const row of produceKinds()) {
      const signal = JSON.parse(row.example) as { readonly nodeId: string }

      expect(
        ids.signals.map((one) => one.nodeId),
        `the ${row.kind} example names ${signal.nodeId}`
      ).toContain(signal.nodeId)
    }
  })
})

describe("the batch the page prints", () => {
  it("is a batch the runtime would accept", () => {
    const batch = produceBatch()

    expect(readerSignalBatchSchema.safeParse(JSON.parse(batch.json)).success).toBe(true)
  })

  it("carries one signal of each kind, about the example tree", () => {
    const batch = produceBatch()

    expect(batch.signals).toBe(READER_SIGNAL_KINDS.length)
    expect(batch.treeId).toMatch(/^t_readersignals/)
    expect(batch.revision).toBe(0)
  })

  /**
   * The page tells a reader the revision is on the batch and not on the signals.
   * A shape that carried it twice would make that paragraph wrong.
   */
  it("names the revision once, on the batch", () => {
    const batch = JSON.parse(produceBatch().json) as {
      readonly revision: number
      readonly signals: readonly Record<string, unknown>[]
    }

    expect(batch.revision).toBeDefined()
    for (const signal of batch.signals) expect(signal).not.toHaveProperty("revision")
  })
})

describe("the read-back block", () => {
  const rows = produceReadBack()

  it("takes the batch a page sent and refuses the other four", () => {
    expect(rows.map((row) => row.accepted)).toEqual([true, false, false, false, false])
  })

  it("prints the runtime's own words for each refusal", () => {
    for (const row of rows.filter((one) => !one.accepted)) {
      expect(row.says.length, row.what).toBeGreaterThan(10)
    }
  })

  /**
   * The page is written around this row. A signal carrying the words a reader
   * saw is refused rather than quietly stripped, and the refusal names the key —
   * which is what makes "a signal carries no content" a property of the runtime
   * rather than a promise on a documentation page.
   */
  it("refuses a signal carrying content, naming the key it refused", () => {
    const row = rows.find((one) => one.what.includes("words a reader saw"))

    expect(row?.accepted).toBe(false)
    expect(row?.says).toContain("label")
  })

  it("refuses a batch that never said which revision", () => {
    const row = rows.find((one) => one.what.includes("revision"))

    expect(row?.accepted).toBe(false)
    expect(row?.says).toContain("revision")
  })
})

describe("what addressing costs", () => {
  const markup = produceAddressedMarkup()

  /**
   * The bag that addressing writes is the bag edit mode writes, and edit mode
   * means far more than identity. The useful question for a published page is
   * not whether the four arrived but whether a fifth ever does.
   */
  it("writes those four attribute names and no others", () => {
    expect(markup.nothingElseIsWritten).toBe(true)
  })

  it("addresses every element the tree has, and the root as well", () => {
    expect(markup.addressedElements).toBeGreaterThan(5)
    expect(markup.onAnElement.map((one) => one.attribute)).toEqual([
      "data-loom-node",
      "data-loom-type",
    ])
    expect(markup.onTheRoot.map((one) => one.attribute)).toEqual([
      "data-loom-tree",
      "data-loom-revision",
    ])
  })

  it("names a real primitive as the element it sampled", () => {
    expect(markup.thatElementIs).toMatch(/^loom\./)
    expect(markup.onAnElement.find((one) => one.attribute === "data-loom-type")?.value).toBe(
      markup.thatElementIs
    )
  })

  it("costs a couple of attributes per element and nothing more", () => {
    expect(markup.bytesAdded).toBeGreaterThan(0)
    expect(markup.bytesAdded).toBeLessThan(markup.addressedElements * 120)
  })
})

/**
 * The endpoint the page shows a reader, run.
 *
 * The page's handler parses and then either answers 400 with the issues or 204.
 * The fence beside it is compiled but never executed, so this is the only place
 * that behaviour is actually exercised — and the issues a caller would be handed
 * are the ones the block above prints.
 */
describe("the endpoint the page shows", () => {
  const handle = (body: unknown): { readonly status: number; readonly issues: number } => {
    const read = parseReaderSignalBatch(body)

    return read.ok ? { status: 204, issues: 0 } : { status: 400, issues: read.error.issues.length }
  }

  it("answers 204 for a batch a Loom page sent", () => {
    expect(handle(JSON.parse(produceBatch().json))).toEqual({ status: 204, issues: 0 })
  })

  it("answers 400 with at least one issue for anything else", () => {
    expect(handle({ hello: "there" }).status).toBe(400)
    expect(handle({ hello: "there" }).issues).toBeGreaterThan(0)
  })
})
