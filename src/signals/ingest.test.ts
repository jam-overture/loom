import { describe, expect, it } from "vitest"

import { batchOf, viewed, viewKey } from "../testing/reader-signal-contract.js"

import { describeIngestError, ingestReaderSignals, MAX_BATCHES_PER_DELIVERY } from "./ingest.js"
import type { ReaderSignalJournal } from "./journal.js"
import { memoryReaderSignalJournal } from "./memory.js"

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

    expect(outcome.ok && outcome.value).toEqual({ batches: 1, signals: 2 })
  })

  it("takes a list, because a queue draining after an outage posts one", async () => {
    const journal = memoryReaderSignalJournal()

    const outcome = await ingestReaderSignals(
      journal,
      asSent([batchOf([viewed("a")]), batchOf([viewed("b")])])
    )

    expect(outcome.ok && outcome.value).toEqual({ batches: 2, signals: 2 })
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
