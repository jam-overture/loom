import { describe, expect, it } from "vitest"

import { treeIdSchema, type TreeId } from "@jam-overture/loom"
import {
  memoryReaderSignalJournal,
  viewKeySchema,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalJournal,
  type ViewKey,
} from "@jam-overture/loom/signals"

import {
  EVENTS_PAGE_SIZE,
  readerEventsOf,
  type ReaderEvent,
  type ReaderEventPage,
  type ReaderPageViewPanel,
} from "./events"

/**
 * Built on the real memory journal rather than a stub, because what is under
 * test is the paging arithmetic over a store's pages — a stub that returned
 * whatever the test wanted would assert the arithmetic against itself. The
 * memory journal is the reference implementation and runs the same six contract
 * suites Postgres does.
 */
const TREE = treeIdSchema.parse("t_home") as TreeId
const OTHER = treeIdSchema.parse("t_pricing") as TreeId

const view = (nth: number): ViewKey =>
  viewKeySchema.parse(String(nth).padStart(32, "0")) as ViewKey

const viewed = (name: string): ReaderSignal => ({
  kind: "viewed",
  nodeId: `n_${name}` as ReaderSignal["nodeId"],
  type: "loom.section" as ReaderSignal["type"],
  at: 1_000,
})

const dwelled = (name: string, ms: number): ReaderSignal => ({
  kind: "dwelled",
  nodeId: `n_${name}` as ReaderSignal["nodeId"],
  type: "loom.section" as ReaderSignal["type"],
  ms,
})

const batch = (
  signals: readonly ReaderSignal[],
  overrides: Partial<Omit<ReaderSignalBatch, "signals">> = {}
): ReaderSignalBatch => ({
  treeId: TREE,
  revision: 3,
  sentAt: 2_000,
  ...overrides,
  signals: [...signals],
})

const journalOf = async (batches: readonly ReaderSignalBatch[]): Promise<ReaderSignalJournal> => {
  const journal = memoryReaderSignalJournal()
  /** One at a time, so the arrival order under test is the order written here. */
  for (const one of batches) await journal.receive([one])

  return journal
}

const unwrapPage = (
  result: Awaited<ReturnType<ReturnType<typeof readerEventsOf>["list"]>>
): ReaderEventPage => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

const unwrapPanel = (
  result: Awaited<ReturnType<ReturnType<typeof readerEventsOf>["pageView"]>>
): ReaderPageViewPanel => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

const nodes = (events: readonly ReaderEvent[]): readonly string[] =>
  events.map((event) => event.signal.nodeId)

/** `n` deliveries of one signal each, named by their number, oldest written first. */
const singles = (n: number): readonly ReaderSignalBatch[] =>
  Array.from({ length: n }, (_, index) => batch([viewed(String(index))], { view: view(1) }))

describe("readerEventsOf — the list", () => {
  it("is one row per signal, newest delivery first", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("hero")]), batch([viewed("band"), dwelled("band", 400)])])
    )

    expect(nodes(unwrapPage(await events.list()).events)).toEqual(["n_band", "n_band", "n_hero"])
  })

  /**
   * The delivery's own order, not the list's order reversed: the sender's array
   * is the only account of the sequence inside one delivery, and a `dwelled`
   * carries no clock at all.
   */
  it("keeps a delivery's signals in the order it sent them", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("first"), viewed("second"), viewed("third")])])
    )

    expect(nodes(unwrapPage(await events.list()).events)).toEqual([
      "n_first",
      "n_second",
      "n_third",
    ])
  })

  it("carries the delivery's facts onto every signal it held", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("hero"), dwelled("hero", 90)], { view: view(7), first: true })])
    )
    const page = unwrapPage(await events.list())

    expect(page.events.map((event) => event.view)).toEqual([view(7), view(7)])
    expect(page.events.map((event) => event.treeId)).toEqual([TREE, TREE])
    expect(page.events.map((event) => event.revision)).toEqual([3, 3])
    expect(page.events.map((event) => event.audienceId)).toEqual(["aud_everyone", "aud_everyone"])
    expect(page.events.every((event) => event.countedAt === undefined)).toBe(true)
  })

  it("says when a fold has counted the delivery and when none has", async () => {
    const journal = await journalOf([batch([viewed("old")]), batch([viewed("new")])])
    const seqs = await journal.read()
    const before = seqs.ok ? (seqs.value.batches[1]?.seq ?? 0) : 0
    await journal.counted({ before, at: "2026-11-05T09:00:00.000Z" })

    const page = unwrapPage(await readerEventsOf(journal).list())

    expect(page.events.map((event) => event.countedAt)).toEqual([
      undefined,
      "2026-11-05T09:00:00.000Z",
    ])
  })

  it("names a signal by its delivery and its place in it, and the same name twice", async () => {
    const events = readerEventsOf(await journalOf([batch([viewed("a"), viewed("b")])]))
    const first = unwrapPage(await events.list()).events
    const again = unwrapPage(await events.list()).events

    expect(first.map((event) => event.id)).toEqual(again.map((event) => event.id))
    expect(new Set(first.map((event) => event.id)).size).toBe(2)
  })

  it("is one page of the site where a tree is named", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("hero")]), batch([viewed("plans")], { treeId: OTHER })])
    )

    expect(nodes(unwrapPage(await events.list({ treeId: OTHER })).events)).toEqual(["n_plans"])
    expect(unwrapPage(await events.list()).events).toHaveLength(2)
  })

  it("is an empty page with nothing after it where nothing has arrived", async () => {
    const page = unwrapPage(await readerEventsOf(await journalOf([])).list())

    expect(page.events).toEqual([])
    expect(page.older).toBeUndefined()
  })

  it("is the whole kept window and not only what one fold has left", async () => {
    const journal = await journalOf([batch([viewed("old")]), batch([viewed("new")])])
    const seqs = await journal.read()
    await journal.counted({
      before: seqs.ok ? (seqs.value.batches[1]?.seq ?? 0) : 0,
      at: "2026-11-05T09:00:00.000Z",
    })

    expect(nodes(unwrapPage(await readerEventsOf(journal).list()).events)).toEqual([
      "n_new",
      "n_old",
    ])
  })
})

describe("readerEventsOf — paging", () => {
  /** Walk the list to the end, as a screen clicking *Older* does. */
  const walk = async (
    events: ReturnType<typeof readerEventsOf>,
    limit: number
  ): Promise<readonly (readonly string[])[]> => {
    const pages: (readonly string[])[] = []
    let cursor: string | undefined

    for (;;) {
      const page = unwrapPage(await events.list({ limit, ...(cursor === undefined ? {} : { cursor }) }))
      pages.push(nodes(page.events))

      if (page.older === undefined) return pages

      cursor = page.older
      /** A list of 1,000 would be 20 pages; anything past that is a cursor that is not advancing. */
      if (pages.length > 50) throw new Error("the cursor did not reach the end")
    }
  }

  it("holds exactly the limit while there are events for it", async () => {
    const events = readerEventsOf(await journalOf(singles(23)))

    expect(await walk(events, 10)).toEqual([
      ["n_22", "n_21", "n_20", "n_19", "n_18", "n_17", "n_16", "n_15", "n_14", "n_13"],
      ["n_12", "n_11", "n_10", "n_9", "n_8", "n_7", "n_6", "n_5", "n_4", "n_3"],
      ["n_2", "n_1", "n_0"],
    ])
  })

  /**
   * **The case the store's own cursor cannot express.** Four deliveries of
   * three signals each, read five at a time: every page but the first starts
   * inside a delivery, which is a position no `ReaderSignalPage` hands out.
   */
  it("ends inside a delivery and resumes inside it", async () => {
    const events = readerEventsOf(
      await journalOf(
        Array.from({ length: 4 }, (_, nth) =>
          batch([viewed(`${nth}a`), viewed(`${nth}b`), viewed(`${nth}c`)])
        )
      )
    )

    expect(await walk(events, 5)).toEqual([
      ["n_3a", "n_3b", "n_3c", "n_2a", "n_2b"],
      ["n_2c", "n_1a", "n_1b", "n_1c", "n_0a"],
      ["n_0b", "n_0c"],
    ])
  })

  /**
   * **The case that would double-count**, which for a list is showing one
   * signal on two pages or skipping it between them. Every event appears
   * exactly once across the walk, whatever the page size divides into.
   */
  it("shows every event exactly once, at every page size", async () => {
    const events = readerEventsOf(
      await journalOf(
        Array.from({ length: 7 }, (_, nth) =>
          batch([viewed(`${nth}a`), viewed(`${nth}b`), viewed(`${nth}c`)])
        )
      )
    )
    const all = nodes(unwrapPage(await events.list({ limit: 100 })).events)

    expect(all).toHaveLength(21)

    for (const size of [1, 2, 3, 4, 5, 20, 21, 22]) {
      const walked = (await walk(events, size)).flat()

      expect(walked, `at a page size of ${size}`).toEqual(all)
    }
  })

  it("stays inside the tree it was asked for while it pages", async () => {
    const events = readerEventsOf(
      await journalOf([
        ...Array.from({ length: 5 }, (_, nth) => batch([viewed(`home${nth}`)])),
        ...Array.from({ length: 5 }, (_, nth) =>
          batch([viewed(`plans${nth}`)], { treeId: OTHER })
        ),
      ])
    )
    const pages: string[] = []
    let cursor: string | undefined

    for (let nth = 0; nth < 5; nth += 1) {
      const page = unwrapPage(
        await events.list({ treeId: TREE, limit: 2, ...(cursor === undefined ? {} : { cursor }) })
      )
      pages.push(...nodes(page.events))

      if (page.older === undefined) break

      cursor = page.older
    }

    expect(pages).toEqual(["n_home4", "n_home3", "n_home2", "n_home1", "n_home0"])
  })

  it("opens the first page for a cursor it did not write", async () => {
    const events = readerEventsOf(await journalOf(singles(3)))
    const first = unwrapPage(await events.list({ limit: 2 })).events

    for (const cursor of ["", "nonsense", Buffer.from("[1]").toString("base64url")]) {
      expect(nodes(unwrapPage(await events.list({ limit: 2, cursor })).events)).toEqual(
        nodes(first)
      )
    }
  })

  it("clamps the page size it was asked for", async () => {
    const events = readerEventsOf(await journalOf(singles(60)))

    expect(unwrapPage(await events.list()).events).toHaveLength(EVENTS_PAGE_SIZE)
    expect(unwrapPage(await events.list({ limit: Number.NaN })).events).toHaveLength(
      EVENTS_PAGE_SIZE
    )
    expect(unwrapPage(await events.list({ limit: 0 })).events).toHaveLength(1)
    expect(unwrapPage(await events.list({ limit: 1_000 })).events).toHaveLength(60)
  })

  /**
   * **The marker the wire carries and no row keeps** (0219). A batch says it
   * opened a page view; both journals drop it at the door, because a row saying
   * when a page view began is the step toward a profile §7 refused — so no
   * event can claim it, and the test is here so that a future field cannot
   * quietly appear.
   */
  it("says nothing about which delivery opened a page view", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("hero")], { view: view(1), first: true })])
    )
    const [event] = unwrapPage(await events.list()).events

    expect(Object.keys(event ?? {}).sort()).toEqual([
      "audienceId",
      "countedAt",
      "id",
      "receivedAt",
      "revision",
      "sentAt",
      "signal",
      "treeId",
      "view",
    ])
  })

  /**
   * One read fills a page when the chunk is whole, two when a resumed chunk
   * leaves it short, and never three — which is the property that keeps a
   * screen's cost flat however deep the reader has paged.
   */
  it("costs at most two reads of the store for one page", async () => {
    const journal = await journalOf(
      Array.from({ length: 12 }, (_, nth) => batch([viewed(`${nth}a`), viewed(`${nth}b`)]))
    )
    const reads: number[] = []
    const counted: ReaderSignalJournal = {
      ...journal,
      read: (request) => {
        reads.push(1)

        return journal.read(request)
      },
    }
    const events = readerEventsOf(counted)
    let cursor: string | undefined

    for (;;) {
      reads.length = 0
      const page = unwrapPage(
        await events.list({ limit: 3, ...(cursor === undefined ? {} : { cursor }) })
      )

      expect(reads.length).toBeLessThanOrEqual(2)

      if (page.older === undefined) break

      cursor = page.older
    }
  })
})

describe("readerEventsOf — one page view", () => {
  const spread = () => [
    batch([viewed("hero")], { view: view(1), first: true }),
    batch([viewed("plans")], { view: view(2), first: true }),
    batch([viewed("nothing")]),
    batch([dwelled("hero", 900)], { view: view(1) }),
  ]

  it("is every signal that carried the key, oldest first", async () => {
    const events = readerEventsOf(await journalOf(spread()))
    const panel = unwrapPanel(await events.pageView(view(1)))

    expect(nodes(panel.events)).toEqual(["n_hero", "n_hero"])
    expect(panel.events.map((event) => event.signal.kind)).toEqual(["viewed", "dwelled"])
    expect(panel.more).toBe(false)
  })

  it("is no signal of another page view, and none that named none", async () => {
    const events = readerEventsOf(await journalOf(spread()))

    expect(nodes(unwrapPanel(await events.pageView(view(2))).events)).toEqual(["n_plans"])
    expect(nodes(unwrapPanel(await events.pageView(view(1))).events)).not.toContain("n_nothing")
  })

  it("is empty for a page view whose deliveries have been swept", async () => {
    const panel = unwrapPanel(await readerEventsOf(await journalOf(spread())).pageView(view(9)))

    expect(panel.events).toEqual([])
    expect(panel.more).toBe(false)
  })

  it("says there is more where the page view is longer than the panel", async () => {
    const events = readerEventsOf(await journalOf(singles(4)))
    const panel = unwrapPanel(await events.pageView(view(1), 2))

    expect(nodes(panel.events)).toEqual(["n_0", "n_1"])
    expect(panel.more).toBe(true)
  })

  /** A delivery of several signals can overrun the bound on its own. */
  it("says there is more where one delivery overran the panel", async () => {
    const events = readerEventsOf(
      await journalOf([batch([viewed("a"), viewed("b"), viewed("c")], { view: view(1) })])
    )
    const panel = unwrapPanel(await events.pageView(view(1), 2))

    expect(nodes(panel.events)).toEqual(["n_a", "n_b"])
    expect(panel.more).toBe(true)
  })
})
