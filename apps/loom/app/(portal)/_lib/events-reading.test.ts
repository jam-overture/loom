import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"

import {
  memoryReaderSignalJournal,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalJournal,
} from "@jam-overture/loom/signals"

import {
  EVENTS_PAGE_SIZE,
  eventKeyOf,
  namingOf,
  parseEventKey,
  type EventFilter,
  type EventPage,
  type EventPlace,
  type EventPosition,
} from "./events"
import { AROUND, readEventPage, readOpenedEvent, SCAN, type EventReading } from "./events-reading"

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

const ALL: EventFilter = { kind: undefined, page: undefined, view: undefined, search: undefined }

/** Nothing published, so a part and a page are found by their ids and kinds. */
const UNNAMED = namingOf([])

const position = (key: string | undefined): EventPosition => {
  const parsed = parseEventKey(key)

  if (parsed === undefined) throw new Error(`not an event: ${String(key)}`)

  return parsed
}

const pageOf = (reading: Result<EventReading, unknown>): EventPage => {
  if (!reading.ok) throw new Error("the memory journal answers")
  if (reading.value.at !== "page") throw new Error("a page, not the newest")

  return reading.value.page
}

const keysOf = (page: EventPage): readonly string[] => page.events.map((event) => event.key)

const keyOf = (at: EventPosition | undefined): string | undefined =>
  at === undefined ? undefined : eventKeyOf(at)

/** Every page from the newest, following *Older*, as one list of keys per page. */
const walk = async (journal: ReaderSignalJournal, filter: EventFilter = ALL) => {
  const pages: (readonly string[])[] = []
  let place: EventPlace | undefined

  for (;;) {
    const page = pageOf(await readEventPage(journal.read, filter, place, UNNAMED))

    pages.push(keysOf(page))

    if (page.older === undefined) return pages

    place = { towards: "older", from: page.older }
  }
}

/** From the oldest page back up, following *Newer* until the newest page is all that is left. */
const walkBack = async (
  journal: ReaderSignalJournal,
  from: EventPosition,
  filter: EventFilter = ALL
) => {
  const pages: (readonly string[])[] = []
  let place: EventPlace = { towards: "newer", from }

  for (;;) {
    const reading = await readEventPage(journal.read, filter, place, UNNAMED)

    if (reading.ok && reading.value.at === "newest") return pages

    const page = pageOf(reading)

    pages.push(keysOf(page))

    if (page.newer === undefined) throw new Error("a page read newer always has a way newer")

    place = { towards: "newer", from: page.newer }
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

  it("narrows to what a search finds in the part or the page", async () => {
    const journal = await journalOf([
      delivery([signal("viewed"), signal("activated", "n_signup")]),
      delivery([signal("activated")], { treeId: "t_pricing" } as Partial<ReaderSignalBatch>),
    ])

    expect(await walk(journal, { ...ALL, search: "n_signup" })).toEqual([["1.1"]])
    expect(await walk(journal, { ...ALL, search: "pricing button" })).toEqual([["2.0"]])
    expect(await walk(journal, { ...ALL, search: "n_signup t_pricing" })).toEqual([[]])
  })

  it("is empty with nothing older when nothing is kept", async () => {
    const page = await readEventPage((await journalOf([])).read, ALL, undefined, UNNAMED)

    expect(page).toEqual({
      ok: true,
      value: {
        at: "page",
        page: { events: [], older: undefined, newer: undefined, searched: undefined },
      },
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

    const first = pageOf(
      await readEventPage(journal.read, { ...ALL, kind: "activated" }, undefined, UNNAMED)
    )

    expect(first.events).toEqual([])
    expect(first.searched).toEqual({
      towards: "older",
      to: new Date(Date.UTC(2026, 10, 5, 9, 1)).toISOString(),
    })
    expect(keyOf(first.older)).toBe("2.0")

    const next = pageOf(
      await readEventPage(
        journal.read,
        { ...ALL, kind: "activated" },
        { towards: "older", from: position(keyOf(first.older)) },
        UNNAMED
      )
    )

    expect(keysOf(next)).toEqual(["1.0"])
  })
})

describe("a page newer", () => {
  it("is the fifty just above the page it was left from, newest first, with Older back down", async () => {
    const journal = await journalOf(
      Array.from({ length: 70 }, () => delivery([signal("viewed"), signal("activated")]))
    )
    const [, second, third] = await walk(journal)

    const back = pageOf(
      await readEventPage(
        journal.read,
        ALL,
        { towards: "newer", from: position(third?.[0]) },
        UNNAMED
      )
    )

    expect(keysOf(back)).toEqual(second)
    expect(keyOf(back.older)).toBe(second?.at(-1))
    expect(keyOf(back.newer)).toBe(second?.[0])
    expect(back.searched).toBeUndefined()
  })

  it("steps up from below everything kept, showing each event once, and ends at the newest", async () => {
    const journal = await journalOf(
      Array.from({ length: 83 }, (_, index) =>
        delivery(Array.from({ length: (index % 3) + 1 }, () => signal("activated")))
      )
    )
    const [newest = []] = await walk(journal)
    const everything = (await walk(journal)).flat()

    const up = await walkBack(journal, { seq: 0, index: 0 })
    const seen = [...up.flat(), ...newest]

    expect(up.every((page) => page.length === EVENTS_PAGE_SIZE)).toBe(true)
    expect(up.flat()).toHaveLength(new Set(up.flat()).size)
    expect(new Set(seen)).toEqual(new Set(everything))
  })

  it("answers the newest page where nothing newer would fill one", async () => {
    const journal = await journalOf(
      Array.from({ length: 30 }, () => delivery([signal("viewed"), signal("activated")]))
    )

    expect(
      await readEventPage(
        journal.read,
        ALL,
        { towards: "newer", from: { seq: 6, index: 0 } },
        UNNAMED
      )
    ).toEqual({ ok: true, value: { at: "newest" } })
  })

  it("keeps to the filter on the way up", async () => {
    const journal = await journalOf(
      Array.from({ length: 120 }, (_, index) =>
        delivery([signal(index % 2 === 0 ? "activated" : "viewed")])
      )
    )
    const page = pageOf(
      await readEventPage(
        journal.read,
        { ...ALL, kind: "activated" },
        { towards: "newer", from: { seq: 1, index: 0 } },
        UNNAMED
      )
    )

    expect(keysOf(page)).toHaveLength(EVENTS_PAGE_SIZE)
    expect(keysOf(page)[0]).toBe("101.0")
    expect(keysOf(page).at(-1)).toBe("3.0")
  })

  /** The mirror of the budget on the way down: what it has not looked at is not *nothing newer*. */
  it("stops at its budget and says how far up it looked, and Newer carries on from there", async () => {
    const budget = SCAN.deliveries * SCAN.reads
    const journal = await journalOf([
      ...Array.from({ length: budget + 1 }, () => delivery([signal("viewed")])),
      delivery([signal("activated")]),
      delivery([signal("viewed")]),
    ])
    const pressed: EventFilter = { ...ALL, kind: "activated" }

    const first = pageOf(
      await readEventPage(
        journal.read,
        pressed,
        { towards: "newer", from: { seq: 1, index: 0 } },
        UNNAMED
      )
    )

    expect(first.events).toEqual([])
    expect(first.searched).toEqual({
      towards: "newer",
      to: new Date(Date.UTC(2026, 10, 5, 9, budget - 1)).toISOString(),
    })
    expect(keyOf(first.newer)).toBe(`${budget}.0`)
    expect(keyOf(first.older)).toBe(`${budget}.0`)

    const next = await readEventPage(
      journal.read,
      pressed,
      { towards: "newer", from: position(keyOf(first.newer)) },
      UNNAMED
    )

    expect(next).toEqual({ ok: true, value: { at: "newest" } })
  })

  it("starts below everything kept when an older page read nothing at all", async () => {
    const journal = await journalOf([delivery([signal("activated")])])
    const elsewhere = { ...ALL, page: "t_pricing" } as EventFilter

    const empty = pageOf(
      await readEventPage(
        journal.read,
        elsewhere,
        { towards: "older", from: { seq: 5, index: 0 } },
        UNNAMED
      )
    )

    expect(empty).toEqual({
      events: [],
      older: undefined,
      newer: { seq: 0, index: 0 },
      searched: undefined,
    })
  })

  it("is reached from an empty older page by where that page stopped reading", async () => {
    const budget = SCAN.deliveries * SCAN.reads
    const journal = await journalOf([
      delivery([signal("activated")]),
      ...Array.from({ length: budget + 60 }, () => delivery([signal("viewed")])),
    ])
    const pressed: EventFilter = { ...ALL, kind: "activated" }

    const stopped = pageOf(
      await readEventPage(
        journal.read,
        pressed,
        { towards: "older", from: { seq: budget + 61, index: 0 } },
        UNNAMED
      )
    )

    expect(stopped.events).toEqual([])
    expect(keyOf(stopped.newer)).toBe("62.0")
    expect(keyOf(stopped.older)).toBe("62.0")
    expect(
      await readEventPage(
        journal.read,
        pressed,
        { towards: "newer", from: { seq: 62, index: 0 } },
        UNNAMED
      )
    ).toEqual({ ok: true, value: { at: "newest" } })
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
