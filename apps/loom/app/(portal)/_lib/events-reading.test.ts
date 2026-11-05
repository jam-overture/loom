import { describe, expect, it } from "vitest"

import {
  memoryReaderSignalJournal,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalJournal,
} from "@jam-overture/loom/signals"

import { EVENTS_PAGE_SIZE, parseEventKey, type EventFilter, type EventPosition } from "./events"
import { AROUND, readEventPage, readOpenedEvent, SCAN } from "./events-reading"

const VIEW_A = "a".repeat(32)
const VIEW_B = "b".repeat(32)

const signal = (kind: "activated" | "viewed", nodeId = "n_cta"): ReaderSignal =>
  ({ kind, nodeId, type: "loom.button", at: 0 }) as ReaderSignal

const delivery = (
  signals: readonly ReaderSignal[],
  overrides: Partial<ReaderSignalBatch> = {}
): ReaderSignalBatch =>
  ({
    treeId: "t_home",
    revision: 1,
    sentAt: 0,
    view: VIEW_A,
    signals,
    ...overrides,
  }) as ReaderSignalBatch

/** A minute apart, so `receivedAt` says which delivery came when. */
const journalOf = async (
  deliveries: readonly ReaderSignalBatch[]
): Promise<ReaderSignalJournal> => {
  let minute = 0
  const journal = memoryReaderSignalJournal({
    now: () => new Date(Date.UTC(2026, 10, 5, 9, minute++)).toISOString(),
  })

  for (const each of deliveries) await journal.receive([each])

  return journal
}

const ALL: EventFilter = { kind: undefined, page: undefined, view: undefined }

const position = (key: string | undefined): EventPosition => {
  const parsed = parseEventKey(key)

  if (parsed === undefined) throw new Error(`not an event: ${String(key)}`)

  return parsed
}

/** Every page from the newest, following *Older*, as one list of keys per page. */
const walk = async (journal: ReaderSignalJournal, filter: EventFilter = ALL) => {
  const pages: string[][] = []
  let before: EventPosition | undefined

  for (;;) {
    const page = await readEventPage(journal.read, filter, before)

    if (!page.ok) throw new Error("the memory journal answers")

    pages.push(page.value.events.map((event) => event.key))

    if (page.value.older === undefined) return pages

    before = position(page.value.older)
  }
}

describe("a page of events", () => {
  it("is fifty, newest first, and ends half way through a delivery where fifty does", async () => {
    const journal = await journalOf(
      Array.from({ length: 30 }, () => delivery([signal("viewed"), signal("activated")]))
    )

    const pages = await walk(journal)

    expect(pages.map((page) => page.length)).toEqual([EVENTS_PAGE_SIZE, 10])
    expect(pages[0]?.slice(0, 3)).toEqual(["30.1", "30.0", "29.1"])
    expect(pages[0]?.at(-1)).toBe("6.0")
    expect(pages[1]?.[0]).toBe("5.1")
  })

  it("shows every kept event once across the pages, with none skipped", async () => {
    const journal = await journalOf(
      Array.from({ length: 37 }, (_, index) =>
        delivery(Array.from({ length: (index % 4) + 1 }, () => signal("activated")))
      )
    )

    const keys = (await walk(journal)).flat()

    expect(keys).toHaveLength(new Set(keys).size)
    expect(keys).toHaveLength(
      Array.from({ length: 37 }, (_, i) => (i % 4) + 1).reduce((a, b) => a + b)
    )
  })

  it("narrows to a kind, a page and a page view", async () => {
    const journal = await journalOf([
      delivery([signal("viewed"), signal("activated")]),
      delivery([signal("activated")], { treeId: "t_pricing" } as Partial<ReaderSignalBatch>),
      delivery([signal("activated")], { view: VIEW_B } as Partial<ReaderSignalBatch>),
    ])

    expect(await walk(journal, { ...ALL, kind: "activated" })).toEqual([["3.0", "2.0", "1.1"]])
    expect(await walk(journal, { ...ALL, page: "t_pricing" } as EventFilter)).toEqual([["2.0"]])
    expect(await walk(journal, { ...ALL, view: VIEW_B })).toEqual([["3.0"]])
  })

  it("is empty with nothing older when nothing is kept", async () => {
    const page = await readEventPage((await journalOf([])).read, ALL, undefined)

    expect(page).toEqual({
      ok: true,
      value: { events: [], older: undefined, searchedTo: undefined },
    })
  })

  /**
   * A narrow filter over a busy window must not read the whole window to fill
   * one page, and must not call what it has not looked at *nothing older*.
   */
  it("stops at its budget and says how far back it looked, and Older carries on from there", async () => {
    const budget = SCAN.deliveries * SCAN.reads
    const journal = await journalOf([
      delivery([signal("activated")]),
      ...Array.from({ length: budget }, () => delivery([signal("viewed")])),
    ])

    const first = await readEventPage(journal.read, { ...ALL, kind: "activated" }, undefined)

    if (!first.ok) throw new Error("the memory journal answers")

    expect(first.value.events).toEqual([])
    expect(first.value.searchedTo).toBe(new Date(Date.UTC(2026, 10, 5, 9, 1)).toISOString())
    expect(first.value.older).toBe("2.0")

    const next = await readEventPage(
      journal.read,
      { ...ALL, kind: "activated" },
      position(first.value.older)
    )

    expect(next.ok && next.value.events.map((event) => event.key)).toEqual(["1.0"])
  })
})

describe("one event, opened", () => {
  it("is found by its address, with the rest of its page view in the order it happened", async () => {
    const journal = await journalOf([
      delivery([signal("viewed")]),
      delivery([signal("activated")], { view: VIEW_B } as Partial<ReaderSignalBatch>),
      delivery([signal("activated"), signal("activated", "n_more")]),
    ])

    const opened = await readOpenedEvent(journal.read, { seq: 3, index: 1 })

    expect(opened.ok && opened.value?.event.signal.nodeId).toBe("n_more")
    expect(opened.ok && opened.value?.pageView.map((event) => event.key)).toEqual([
      "1.0",
      "3.0",
      "3.1",
    ])
    expect(opened.ok && opened.value?.whole).toBe(true)
  })

  it("is not found once it is no longer kept, or where the address names no signal", async () => {
    const journal = await journalOf([delivery([signal("viewed")])])

    expect(await readOpenedEvent(journal.read, { seq: 9, index: 0 })).toEqual({
      ok: true,
      value: undefined,
    })
    expect(await readOpenedEvent(journal.read, { seq: 1, index: 4 })).toEqual({
      ok: true,
      value: undefined,
    })
  })

  it("says when its page view may reach past the deliveries it looked through", async () => {
    const journal = await journalOf(
      Array.from({ length: AROUND + 2 }, () => delivery([signal("viewed")]))
    )

    const opened = await readOpenedEvent(journal.read, { seq: AROUND + 2, index: 0 })

    expect(opened.ok && opened.value?.whole).toBe(false)
    expect(opened.ok && opened.value?.pageView).toHaveLength(AROUND + 1)
  })

  it("has no page view where the site named none", async () => {
    const journal = await journalOf([
      delivery([signal("viewed")], { view: undefined } as Partial<ReaderSignalBatch>),
    ])

    const opened = await readOpenedEvent(journal.read, { seq: 1, index: 0 })

    expect(opened.ok && opened.value).toMatchObject({ pageView: [], whole: true })
  })
})
