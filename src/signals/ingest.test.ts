import { describe, expect, it } from "vitest"

import { batchOf, region, viewed, viewKey } from "../testing/reader-signal-contract.js"

import { describeIngestError, ingestReaderSignals, MAX_BATCHES_PER_DELIVERY } from "./ingest.js"
import type { ReaderSignalJournal } from "./journal.js"
import { memoryReaderRegionStore, memoryReaderSignalJournal } from "./memory.js"
import type { ReaderRegionStore } from "./region.js"

const refusing = (): ReaderSignalJournal => ({
  ...memoryReaderSignalJournal(),
  receive: () => Promise.resolve({ ok: false, error: { code: "unavailable", detail: "no database" } }),
})

/** What a browser actually posts: JSON, so branded types have already been lost. */
const asSent = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe("ingestReaderSignals", () => {
  it("takes one batch and counts what it kept", async () => {
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(journal, asSent(batchOf([viewed("a"), viewed("b")])))

    expect(outcome.ok && outcome.value).toEqual({ batches: 1, signals: 2, regions: 0 })
  })

  it("takes a list, because a queue draining after an outage posts one", async () => {
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(
      journal,
      asSent([batchOf([viewed("a")]), batchOf([viewed("b")])])
    )

    expect(outcome.ok && outcome.value).toEqual({ batches: 2, signals: 2, regions: 0 })
  })

  it("keeps what it accepted, in order", async () => {
    const journal = memoryReaderSignalJournal()
    await ingestReaderSignals(journal, asSent([batchOf([viewed("a")]), batchOf([viewed("b")])]))

    const page = await journal.read()

    expect(page.ok && page.value.batches).toHaveLength(2)
  })

  it("keeps the view key a page minted", async () => {
    const journal = memoryReaderSignalJournal()
    await ingestReaderSignals(journal, asSent(batchOf([viewed("a")], { view: viewKey(9) })))

    const page = await journal.read()

    expect(page.ok && page.value.batches[0]?.view).toBe(viewKey(9))
  })

  describe("what it refuses", () => {
    it("refuses a body that is not a batch at all", async () => {
      const refused = await ingestReaderSignals(memoryReaderSignalJournal(), "hello")

      expect(refused.ok).toBe(false)
      expect(!refused.ok && refused.error.code).toBe("invalid-delivery")
    })

    it("refuses a kind the vocabulary does not have", async () => {
      const refused = await ingestReaderSignals(
        memoryReaderSignalJournal(),
        asSent(batchOf([{ ...viewed("a"), kind: "hovered" } as never]))
      )

      expect(refused.ok).toBe(false)
    })

    /**
     * The field a host wanting a visitor id would reach for. Refusing it at the
     * door is what makes 0146's rule enforced rather than documented.
     */
    it("refuses a view key that is anything but thirty-two characters of nothing", async () => {
      const refused = await ingestReaderSignals(
        memoryReaderSignalJournal(),
        asSent(batchOf([viewed("a")], { view: "reader@example.com" as never }))
      )

      expect(refused.ok).toBe(false)
    })

    it("refuses a field the batch schema does not have", async () => {
      const refused = await ingestReaderSignals(memoryReaderSignalJournal(), {
        ...(asSent(batchOf([viewed("a")])) as object),
        visitorId: "v_1",
      })

      expect(refused.ok).toBe(false)
    })

    it("says which batch of a delivery was the bad one", async () => {
      const refused = await ingestReaderSignals(
        memoryReaderSignalJournal(),
        asSent([batchOf([viewed("a")]), { treeId: "not a tree" }])
      )

      expect(!refused.ok && refused.error.code === "invalid-delivery" && refused.error.index).toBe(1)
    })

    /**
     * A partial accept would leave a sender unable to retry: its second attempt
     * either duplicates what was taken or drops what was not, and a browser
     * cannot be asked to work out which.
     */
    it("keeps none of a delivery when one batch of it is bad", async () => {
      const journal = memoryReaderSignalJournal()
      await ingestReaderSignals(journal, asSent([batchOf([viewed("a")]), { treeId: "not a tree" }]))

      const page = await journal.read()

      expect(page.ok && page.value.batches).toEqual([])
    })

    it("refuses a delivery longer than one request should parse", async () => {
      const many = Array.from({ length: MAX_BATCHES_PER_DELIVERY + 1 }, () => batchOf([viewed("a")]))

      const refused = await ingestReaderSignals(memoryReaderSignalJournal(), asSent(many))

      expect(!refused.ok && refused.error.code).toBe("too-many")
    })

    it("accepts a delivery exactly at the limit", async () => {
      const many = Array.from({ length: MAX_BATCHES_PER_DELIVERY }, () => batchOf([viewed("a")]))

      const accepted = await ingestReaderSignals(memoryReaderSignalJournal(), asSent(many))

      expect(accepted.ok && accepted.value.batches).toBe(MAX_BATCHES_PER_DELIVERY)
    })

    it("hands back the store's failure rather than swallowing it", async () => {
      const refused = await ingestReaderSignals(refusing(), asSent(batchOf([viewed("a")])))

      expect(!refused.ok && refused.error.code).toBe("unavailable")
    })
  })

  describe("describeIngestError", () => {
    it("says which batch and why", async () => {
      const refused = await ingestReaderSignals(
        memoryReaderSignalJournal(),
        asSent([batchOf([viewed("a")]), { treeId: "not a tree" }])
      )

      expect(!refused.ok && describeIngestError(refused.error)).toContain("batch 1")
    })

    it("says how many were sent when there were too many", async () => {
      const many = Array.from({ length: MAX_BATCHES_PER_DELIVERY + 2 }, () => batchOf([viewed("a")]))
      const refused = await ingestReaderSignals(memoryReaderSignalJournal(), asSent(many))

      expect(!refused.ok && describeIngestError(refused.error)).toContain(
        String(MAX_BATCHES_PER_DELIVERY + 2)
      )
    })
  })
})

describe("where a delivery came from", () => {
  const AT = "2026-10-02T00:00:00.000Z"
  const GB = region("GB")

  const opening = (nth: number) =>
    asSent(batchOf([viewed("a")], { view: viewKey(nth), first: true }))

  const regionsIn = async (store: ReaderRegionStore) => {
    const rows = await store.regions()

    return rows.ok ? rows.value.map((row) => `${row.region}:${row.views}`) : ["unavailable"]
  }

  it("counts a reader arriving, once, against a bucket", async () => {
    const regions = memoryReaderRegionStore()

    const outcome = await ingestReaderSignals(memoryReaderSignalJournal(), opening(1), {
      store: regions,
      region: GB,
      at: AT,
    })

    expect(outcome.ok && outcome.value.regions).toBe(1)
    expect(await regionsIn(regions)).toEqual(["GB:1"])
  })

  it("counts nothing for the deliveries that follow", async () => {
    const regions = memoryReaderRegionStore()
    const where = { store: regions, region: GB, at: AT }
    const journal = memoryReaderSignalJournal()

    await ingestReaderSignals(journal, opening(1), where)
    await ingestReaderSignals(journal, asSent(batchOf([viewed("b")], { view: viewKey(1) })), where)

    expect(await regionsIn(regions)).toEqual(["GB:1"])
  })

  it("counts nothing at all for a caller that does not say where", async () => {
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(journal, opening(1))

    expect(outcome.ok && outcome.value.regions).toBe(0)
  })

  /**
   * The region never lands on the row the batch is buffered in. It is the whole
   * constraint, so it is asserted rather than assumed: a reader of the buffer
   * can see which page view a batch belonged to and can never see where it came
   * from.
   */
  it("never writes the region onto the buffered batch", async () => {
    const journal = memoryReaderSignalJournal()
    await ingestReaderSignals(journal, opening(1), { store: memoryReaderRegionStore(), region: GB, at: AT })

    const page = await journal.read()
    const stored = page.ok ? page.value.batches[0] : undefined

    expect(JSON.stringify(stored)).not.toContain("GB")
  })

  /**
   * The batch is already kept, so refusing the delivery would invite a retry
   * that counted every signal in it twice. A region that could not be written is
   * a counter that did not move, reported rather than raised.
   */
  it("keeps a delivery whose region could not be counted, and says why", async () => {
    const refusing: ReaderRegionStore = {
      ...memoryReaderRegionStore(),
      count: () => Promise.resolve({ ok: false, error: { code: "unavailable", detail: "no database" } }),
    }
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(journal, opening(1), { store: refusing, region: GB, at: AT })

    expect(outcome.ok && outcome.value.regions).toBe(0)
    expect(outcome.ok && outcome.value.regionError?.detail).toBe("no database")

    const page = await journal.read()
    expect(page.ok && page.value.batches).toHaveLength(1)
  })

  it("refuses an opening that names no page view, like any other malformed batch", async () => {
    const refused = await ingestReaderSignals(
      memoryReaderSignalJournal(),
      asSent(batchOf([viewed("a")], { first: true }))
    )

    expect(refused.ok).toBe(false)
    expect(!refused.ok && refused.error.code).toBe("invalid-delivery")
  })
})
