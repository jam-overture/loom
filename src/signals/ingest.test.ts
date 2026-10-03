import { describe, expect, it } from "vitest"

import { batchOf, dwelled, region, viewed, viewKey } from "../testing/reader-signal-contract.js"

import { describeIngestError, ingestReaderSignals, MAX_BATCHES_PER_DELIVERY } from "./ingest.js"
import type { ReaderSignalJournal } from "./journal.js"
import { memoryReaderRegionStore, memoryReaderSignalJournal, memoryReaderTallyStore } from "./memory.js"
import type { ReaderRegionStore } from "./region.js"
import type { ReaderTallyStore } from "./tally.js"

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

    expect(outcome.ok && outcome.value).toEqual({ batches: 1, signals: 2, opened: 0, regions: 0 })
  })

  it("takes a list, because a queue draining after an outage posts one", async () => {
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(
      journal,
      asSent([batchOf([viewed("a")]), batchOf([viewed("b")])])
    )

    expect(outcome.ok && outcome.value).toEqual({ batches: 2, signals: 2, opened: 0, regions: 0 })
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

describe("how many page views began", () => {
  const AT = "2026-10-03T00:00:00.000Z"
  const GB = region("GB")

  const opening = (nth: number) =>
    asSent(batchOf([viewed("a")], { view: viewKey(nth), first: true }))

  const openedIn = async (store: ReaderTallyStore) => {
    const rows = await store.pageViews()

    return rows.ok ? rows.value.map((row) => `${row.revision}:${row.opened}:${row.appearances}`) : ["unavailable"]
  }

  it("counts a reader arriving, once, against the exact counter", async () => {
    const openings = memoryReaderTallyStore()

    const outcome = await ingestReaderSignals(memoryReaderSignalJournal(), opening(1), { at: AT, openings })

    expect(outcome.ok && outcome.value.opened).toBe(1)
    expect(await openedIn(openings)).toEqual(["1:1:0"])
  })

  /**
   * The counter would be worthless otherwise. A reader who stays ten minutes
   * posts a hundred deliveries, and a page-view count that moved with each of
   * them would make one visitor a readership — which is the same inversion
   * 0214 refused for the region buckets, in the number everything else is a
   * rate against.
   */
  it("counts nothing for the deliveries that follow the opening one", async () => {
    const openings = memoryReaderTallyStore()
    const counters = { at: AT, openings }
    const journal = memoryReaderSignalJournal()

    await ingestReaderSignals(journal, opening(1), counters)
    await ingestReaderSignals(journal, asSent(batchOf([viewed("b")], { view: viewKey(1) })), counters)
    await ingestReaderSignals(journal, asSent(batchOf([dwelled("b", 400)], { view: viewKey(1) })), counters)

    expect(await openedIn(openings)).toEqual(["1:1:0"])
  })

  /**
   * A queue draining after an outage re-posts what it could not confirm, and a
   * page view counted twice cannot be uncounted (0158). Inside one delivery the
   * keys are compared; the retry that arrives as its own delivery is the bound
   * this counter has and the record says so.
   */
  it("counts one arrival when a delivery carries the same opening twice", async () => {
    const openings = memoryReaderTallyStore()

    const outcome = await ingestReaderSignals(
      memoryReaderSignalJournal(),
      asSent([
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
      ]),
      { at: AT, openings }
    )

    expect(outcome.ok && outcome.value.opened).toBe(1)
    expect(await openedIn(openings)).toEqual(["1:1:0"])
  })

  it("counts two readers who arrived in one delivery", async () => {
    const openings = memoryReaderTallyStore()

    const outcome = await ingestReaderSignals(
      memoryReaderSignalJournal(),
      asSent([
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(2), first: true }),
      ]),
      { at: AT, openings }
    )

    expect(outcome.ok && outcome.value.opened).toBe(2)
    expect(await openedIn(openings)).toEqual(["1:2:0"])
  })

  it("counts nothing for a caller that keeps no such counter", async () => {
    const outcome = await ingestReaderSignals(memoryReaderSignalJournal(), opening(1))

    expect(outcome.ok && outcome.value.opened).toBe(0)
  })

  /**
   * The two counters are stamped onto one walk, so a delivery can never be one
   * arrival to the page-view counter and two to the region buckets. A map whose
   * numbers did not add up to the page views there were would be unexplainable
   * from the rows.
   */
  it("tells the region buckets and the exact counter the same number", async () => {
    const openings = memoryReaderTallyStore()
    const regions = memoryReaderRegionStore()

    const outcome = await ingestReaderSignals(
      memoryReaderSignalJournal(),
      asSent([
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(2), first: true }),
      ]),
      { at: AT, openings, region: { store: regions, region: GB } }
    )

    expect(outcome.ok && outcome.value).toMatchObject({ opened: 2, regions: 2 })
  })

  /**
   * The batch is already kept, so refusing the delivery would invite a retry
   * that counted every signal in it twice. A counter that could not be written
   * is a counter that did not move, reported rather than raised.
   */
  it("keeps a delivery whose arrival could not be counted, and says why", async () => {
    const openings: ReaderTallyStore = {
      ...memoryReaderTallyStore(),
      opened: () => Promise.resolve({ ok: false, error: { code: "unavailable", detail: "no database" } }),
    }
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(journal, opening(1), { at: AT, openings })

    expect(outcome.ok && outcome.value.opened).toBe(0)
    expect(outcome.ok && outcome.value.openingError?.detail).toBe("no database")

    const page = await journal.read()
    expect(page.ok && page.value.batches).toHaveLength(1)
  })

  /** A reader who arrived and read nothing, which the ordering is what prevents. */
  it("counts no arrival for a delivery the buffer refused", async () => {
    const openings = memoryReaderTallyStore()

    const refused = await ingestReaderSignals(refusing(), opening(1), { at: AT, openings })

    expect(refused.ok).toBe(false)
    expect(await openedIn(openings)).toEqual([])
  })

  /**
   * The marker is read at the door and goes no further (0214). The buffer is
   * for what a rollup reads, and a rollup counting arrivals as well would be a
   * second place deciding how many readers there were.
   */
  it("never writes the opening marker onto the buffered batch", async () => {
    const journal = memoryReaderSignalJournal()
    await ingestReaderSignals(journal, opening(1), { at: AT, openings: memoryReaderTallyStore() })

    const page = await journal.read()

    expect(page.ok && page.value.batches[0]?.first).toBeUndefined()
    expect(page.ok && page.value.batches[0]?.view).toBe(viewKey(1))
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
      at: AT,
      region: { store: regions, region: GB },
    })

    expect(outcome.ok && outcome.value.regions).toBe(1)
    expect(await regionsIn(regions)).toEqual(["GB:1"])
  })

  it("counts nothing for the deliveries that follow", async () => {
    const regions = memoryReaderRegionStore()
    const where = { at: AT, region: { store: regions, region: GB } }
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
    await ingestReaderSignals(journal, opening(1), {
      at: AT,
      region: { store: memoryReaderRegionStore(), region: GB },
    })

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

    const outcome = await ingestReaderSignals(journal, opening(1), {
      at: AT,
      region: { store: refusing, region: GB },
    })

    expect(outcome.ok && outcome.value.regions).toBe(0)
    expect(outcome.ok && outcome.value.regionError?.detail).toBe("no database")

    const page = await journal.read()
    expect(page.ok && page.value.batches).toHaveLength(1)
  })

  /**
   * The ordering, which is the half a passing region test would not notice. A
   * region counted for a delivery the buffer then refused is a reader who
   * arrived from a country and read nothing: every other counter about that page
   * view is missing, and the one number that is there is the one about where
   * they were.
   */
  it("counts no region for a delivery the buffer refused", async () => {
    const regions = memoryReaderRegionStore()

    const refused = await ingestReaderSignals(refusing(), opening(1), {
      at: AT,
      region: { store: regions, region: GB },
    })

    expect(refused.ok).toBe(false)
    expect(await regionsIn(regions)).toEqual([])
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
