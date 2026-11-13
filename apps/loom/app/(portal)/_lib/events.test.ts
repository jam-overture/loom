import { describe, expect, it } from "vitest"

import type { NodeId, TreeId } from "@jam-overture/loom"
import type { ReaderSignal, ReceivedBatch } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import {
  eventKeyOf,
  eventPagesOf,
  eventQueryOf,
  eventSentence,
  eventsHref,
  eventsOf,
  goalsCountedBy,
  happenedOf,
  isOlderThan,
  matchesFilter,
  matchesSearch,
  namingOf,
  pageViewOf,
  parseEventKey,
  searchOf,
  SEARCH_LENGTH,
  type EventFilter,
  type EventView,
  type ReaderEvent,
} from "./events"
import { goalIdSchema, type Goal } from "./goals/goal"
import { elementIdsOf } from "./proposing/fixtures"

const home = pageFixture("home", "Welcome", 3)
const [, heading] = elementIdsOf(home)

if (heading === undefined) throw new Error("the fixture has a heading")

const VIEW_A = "a".repeat(32)
const VIEW_B = "b".repeat(32)

const pressed = (nodeId: string = heading): ReaderSignal =>
  ({
    kind: "activated",
    nodeId,
    type: "loom.heading",
    at: Date.UTC(2026, 10, 5, 9, 30),
  }) as ReaderSignal

const batch = (
  seq: number,
  signals: readonly ReaderSignal[],
  overrides: Partial<ReceivedBatch> = {}
): ReceivedBatch =>
  ({
    seq,
    treeId: home.treeId,
    revision: 3,
    sentAt: 0,
    receivedAt: `2026-11-05T09:${String(seq).padStart(2, "0")}:00.000Z`,
    audienceId: "aud_everyone",
    view: VIEW_A,
    signals,
    ...overrides,
  }) as ReceivedBatch

const eventOf = (signal: ReaderSignal, overrides: Partial<ReceivedBatch> = {}): ReaderEvent => {
  const [event] = eventsOf([batch(1, [signal], overrides)])

  if (event === undefined) throw new Error("one signal is one event")

  return event
}

const EVERYTHING: EventFilter = {
  kind: undefined,
  page: undefined,
  view: undefined,
  search: undefined,
  segment: undefined,
}

const goal = (overrides: Partial<Goal>): Goal => ({
  goalId: goalIdSchema.parse(`g_${"1".repeat(32)}`),
  name: "Starts",
  kind: "activated",
  nodeId: heading,
  pages: null,
  primarySince: null,
  createdAt: 0,
  createdBy: null,
  ...overrides,
})

describe("an event's address", () => {
  it("names a delivery and a signal in it, and reads back what it wrote", () => {
    expect(eventKeyOf({ seq: 12, index: 3 })).toBe("12.3")
    expect(parseEventKey("12.3")).toEqual({ seq: 12, index: 3 })
  })

  it("reads nothing from an address that is not one", () => {
    expect(parseEventKey(undefined)).toBeUndefined()
    expect(parseEventKey("12")).toBeUndefined()
    expect(parseEventKey("-1.0")).toBeUndefined()
    expect(parseEventKey("1.0.0")).toBeUndefined()
  })
})

describe("events from deliveries", () => {
  it("are newest first: the later delivery, and within one the later signal", () => {
    const events = eventsOf([batch(1, [pressed(), pressed()]), batch(2, [pressed()])])

    expect(events.map((event) => event.key)).toEqual(["2.0", "1.1", "1.0"])
  })

  it("carry what the delivery says about where they came from", () => {
    const event = eventOf(pressed(), {
      audienceId: "aud_pro",
      view: VIEW_B,
    } as Partial<ReceivedBatch>)

    expect(event).toMatchObject({
      treeId: home.treeId,
      revision: 3,
      audienceId: "aud_pro",
      view: VIEW_B,
      receivedAt: "2026-11-05T09:01:00.000Z",
    })
  })

  it("know which are older than a position", () => {
    const older = isOlderThan({ seq: 2, index: 1 })

    expect(older({ seq: 2, index: 0 })).toBe(true)
    expect(older({ seq: 1, index: 9 })).toBe(true)
    expect(older({ seq: 2, index: 1 })).toBe(false)
    expect(older({ seq: 3, index: 0 })).toBe(false)
  })
})

describe("the filter", () => {
  it("is read off the address, and a value that does not parse narrows nothing", () => {
    expect(
      eventQueryOf({
        kind: "activated",
        on: home.treeId,
        view: VIEW_A,
        q: "  sign   up ",
        range: "7d",
        before: "4.1",
        event: "3.0",
      })
    ).toEqual({
      kind: "activated",
      page: home.treeId,
      view: VIEW_A,
      search: "sign up",
      live: false,
      range: "7d",
      place: { towards: "older", from: { seq: 4, index: 1 } },
      open: { seq: 3, index: 0 },
    })
    expect(eventQueryOf({ after: "4.1" }).place).toEqual({
      towards: "newer",
      from: { seq: 4, index: 1 },
    })
    expect(eventQueryOf({ after: "4.1", before: "2.0" }).place).toEqual({
      towards: "older",
      from: { seq: 2, index: 0 },
    })
    expect(
      eventQueryOf({
        kind: "clicked",
        on: "not a page",
        view: "short",
        q: ["a", "b"],
        range: "a year",
        before: ["1.0", "2.0"],
      })
    ).toEqual({
      kind: undefined,
      page: undefined,
      view: undefined,
      search: undefined,
      live: false,
      range: "24h",
      place: undefined,
      open: undefined,
    })
  })

  it("is live only on the newest page, and only when the address says so", () => {
    expect(eventQueryOf({ live: "on" }).live).toBe(true)
    expect(eventQueryOf({ live: "yes" }).live).toBe(false)
    expect(eventQueryOf({ live: ["on", "on"] }).live).toBe(false)
    expect(eventQueryOf({ live: "on", before: "4.1" }).live).toBe(false)
    expect(eventQueryOf({ live: "on", after: "4.1" }).live).toBe(false)
  })

  it("keeps an event only when it matches every part of the filter", () => {
    const event = eventOf(pressed())
    const naming = namingOf([{ tree: home, receivedAt: 0 }])
    const keeps = (filter: Partial<EventFilter>): boolean =>
      matchesFilter({ ...EVERYTHING, ...filter }, naming)(event)

    expect(keeps({})).toBe(true)
    expect(keeps({ kind: "activated", page: home.treeId, view: VIEW_A, search: "welcome" })).toBe(
      true
    )
    expect(keeps({ kind: "viewed" })).toBe(false)
    expect(keeps({ page: "t_other" as TreeId })).toBe(false)
    expect(keeps({ view: VIEW_B })).toBe(false)
    expect(keeps({ search: "pricing" })).toBe(false)
  })

  it("narrows to one segment's readers: the deliveries filed under its audience", () => {
    const naming = namingOf([{ tree: home, receivedAt: 0 }])
    const keeps = (event: ReaderEvent, segment: string | undefined): boolean =>
      matchesFilter({ ...EVERYTHING, segment }, naming)(event)
    const phone = eventOf(pressed(), { audienceId: "aud_phone" } as Partial<ReceivedBatch>)

    expect(eventQueryOf({ segment: "phone" }).segment).toBe("phone")
    expect(eventQueryOf({ segment: "everyone" }).segment).toBeUndefined()
    expect(eventQueryOf({ segment: "not a word" }).segment).toBeUndefined()
    expect(keeps(phone, "phone")).toBe(true)
    expect(keeps(phone, undefined)).toBe(true)
    expect(keeps(eventOf(pressed()), "phone")).toBe(false)
    expect(keeps(phone, "search")).toBe(false)
  })

  it("carries the segment to every address", () => {
    expect(
      eventsHref(
        "/portal/prj_a/signals",
        { ...EVERYTHING, kind: "viewed", segment: "phone", live: false, range: "7d" },
        { event: "3.0" }
      )
    ).toBe("/portal/prj_a/signals?kind=viewed&range=7d&segment=phone&event=3.0")
  })

  it("writes an address that keeps the filter and names what changes", () => {
    const filter: EventView = {
      ...EVERYTHING,
      kind: "activated",
      page: home.treeId,
      search: "sign up",
      live: false,
      range: "24h",
    }

    expect(
      eventsHref("/portal/prj_a/signals", filter, {
        place: { towards: "older", from: { seq: 4, index: 1 } },
        event: "3.0",
      })
    ).toBe(`/portal/prj_a/signals?kind=activated&on=${home.treeId}&q=sign+up&before=4.1&event=3.0`)
    expect(
      eventsHref("/portal/prj_a/signals", filter, {
        place: { towards: "newer", from: { seq: 4, index: 1 } },
      })
    ).toBe(`/portal/prj_a/signals?kind=activated&on=${home.treeId}&q=sign+up&after=4.1`)
    expect(eventsHref("/portal/prj_a/signals", { ...EVERYTHING, live: false, range: "24h" })).toBe(
      "/portal/prj_a/signals"
    )
  })

  it("carries live to every address but one that names a cursor", () => {
    const live: EventView = { ...EVERYTHING, kind: "viewed", live: true, range: "24h" }

    expect(eventsHref("/portal/prj_a/signals", live)).toBe(
      "/portal/prj_a/signals?kind=viewed&live=on"
    )
    expect(eventsHref("/portal/prj_a/signals", live, { event: "3.0" })).toBe(
      "/portal/prj_a/signals?kind=viewed&live=on&event=3.0"
    )
    expect(
      eventsHref("/portal/prj_a/signals", live, {
        place: { towards: "newer", from: { seq: 4, index: 1 } },
      })
    ).toBe("/portal/prj_a/signals?kind=viewed&after=4.1")
  })

  it("carries a range other than the default to every address", () => {
    const week: EventView = { ...EVERYTHING, live: true, range: "7d" }

    expect(eventsHref("/portal/prj_a/signals", week)).toBe("/portal/prj_a/signals?range=7d&live=on")
    expect(
      eventsHref("/portal/prj_a/signals", week, {
        place: { towards: "older", from: { seq: 4, index: 1 } },
      })
    ).toBe("/portal/prj_a/signals?range=7d&before=4.1")
  })
})

describe("the search over part and page", () => {
  const naming = namingOf([{ tree: home, receivedAt: 0 }])
  const finds = (search: string, signal: ReaderSignal = pressed()): boolean =>
    matchesSearch(search, naming)(eventOf(signal))

  it("keeps what it was typed as, tidied, and is nothing when nothing is left", () => {
    expect(searchOf("  the   heading ")).toBe("the heading")
    expect(searchOf("x".repeat(SEARCH_LENGTH + 20))).toHaveLength(SEARCH_LENGTH)
    expect(searchOf("   ")).toBeUndefined()
    expect(searchOf(undefined)).toBeUndefined()
  })

  it("finds an event by its page's name or id, whatever the case", () => {
    expect(finds("WELCOME")).toBe(true)
    expect(finds(home.treeId)).toBe(true)
  })

  it("finds an event by its part's name, id or kind", () => {
    expect(finds("heading")).toBe(true)
    expect(finds(heading)).toBe(true)
    expect(finds("button")).toBe(false)
  })

  it("needs every word somewhere, in any order", () => {
    expect(finds("welcome heading")).toBe(true)
    expect(finds("heading welcome")).toBe(true)
    expect(finds("welcome pricing")).toBe(false)
  })

  it("finds a part the site has not published by its id and kind alone", () => {
    expect(finds("n_gone", pressed("n_gone"))).toBe(true)
    expect(finds("heading", pressed("n_gone"))).toBe(true)
    expect(matchesSearch("welcome", namingOf([]))(eventOf(pressed()))).toBe(false)
  })
})

describe("what an event says", () => {
  const naming = namingOf([{ tree: home, receivedAt: 0 }])

  it("names the page and the part by what the site published", () => {
    expect(eventSentence(eventOf(pressed()), naming)).toBe(
      "A reader pressed the heading “Welcome” on Welcome."
    )
  })

  it("says each kind in its own words", () => {
    const at = 0
    const on = { nodeId: heading, type: "loom.heading" }

    expect(eventSentence(eventOf({ kind: "viewed", ...on, at } as ReaderSignal), naming)).toBe(
      "A reader opened Welcome."
    )
    expect(
      eventSentence(eventOf({ kind: "dwelled", ...on, ms: 4_200 } as ReaderSignal), naming)
    ).toBe("A reader had the heading “Welcome” on screen for 4.2 seconds on Welcome.")
    expect(
      eventSentence(eventOf({ kind: "disclosed", ...on, open: false, at } as ReaderSignal), naming)
    ).toBe("A reader closed the heading “Welcome” on Welcome.")
    expect(eventSentence(eventOf({ kind: "completed", ...on, at } as ReaderSignal), naming)).toBe(
      "A reader sent the heading “Welcome” on Welcome."
    )
  })

  it("says what kind of part it was where the site has not published the page", () => {
    expect(eventSentence(eventOf(pressed("n_gone")), namingOf([]))).toBe(
      "A reader pressed a heading on a page the site has not published to Loom."
    )
  })

  it("gives a moment by the reader's clock, and a dwell its length instead", () => {
    expect(happenedOf(pressed())).toEqual({ at: "2026-11-05T09:30:00.000Z" })
    expect(
      happenedOf({
        kind: "dwelled",
        nodeId: heading,
        type: "loom.heading",
        ms: 1_000,
      } as ReaderSignal)
    ).toEqual({ lasted: "1 second" })
  })
})

describe("the goals an event counts toward", () => {
  it("are those on its kind, its part and its page", () => {
    const event = eventOf(pressed())
    const everywhere = goal({ name: "Everywhere" })
    const here = goal({ name: "Here", pages: [home.treeId] })
    const elsewhere = goal({ name: "Elsewhere", pages: ["t_other" as TreeId] })
    const otherPart = goal({ name: "Other part", nodeId: "n_other" as NodeId })
    const otherKind = goal({ name: "Sends", kind: "completed" })

    expect(
      goalsCountedBy(event, [everywhere, here, elsewhere, otherPart, otherKind]).map(
        (each) => each.name
      )
    ).toEqual(["Everywhere", "Here"])
  })

  it("count an opening and not a closing, as *Opens it* is read", () => {
    const opens = goal({ kind: "disclosed" })
    const on = { kind: "disclosed", nodeId: heading, type: "loom.heading", at: 0 }

    expect(goalsCountedBy(eventOf({ ...on, open: true } as ReaderSignal), [opens])).toHaveLength(1)
    expect(goalsCountedBy(eventOf({ ...on, open: false } as ReaderSignal), [opens])).toHaveLength(0)
  })
})

describe("the rest of a page view", () => {
  it("is every event sharing its view key, in the order they happened", () => {
    const around = [
      batch(1, [pressed(), pressed()]),
      batch(2, [pressed()], { view: VIEW_B } as Partial<ReceivedBatch>),
      batch(3, [pressed()]),
    ]
    const [event] = eventsOf([batch(3, [pressed()])])

    if (event === undefined) throw new Error("one event")

    expect(pageViewOf(event, around).map((each) => each.key)).toEqual(["1.0", "1.1", "3.0"])
  })

  it("is nothing where the site named no page view", () => {
    const event = eventOf(pressed(), { view: undefined } as Partial<ReceivedBatch>)

    expect(pageViewOf(event, [batch(2, [pressed()])])).toEqual([])
  })
})

describe("the page picker", () => {
  it("offers every page opened or published once, named pages first", () => {
    const naming = namingOf([{ tree: home, receivedAt: 0 }])

    expect(
      eventPagesOf(["t_bare", home.treeId, "t_bare"], [{ tree: home, receivedAt: 0 }], naming)
    ).toEqual([
      { treeId: home.treeId, name: "Welcome" },
      { treeId: "t_bare", name: undefined },
    ])
  })
})
