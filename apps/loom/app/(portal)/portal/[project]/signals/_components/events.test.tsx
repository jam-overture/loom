import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ReaderSignal, ReceivedBatch } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"
import { eventsOf, namingOf, type EventPage, type ReaderEvent } from "@/app/(portal)/_lib/events"
import { elementIdsOf } from "@/app/(portal)/_lib/proposing/fixtures"

import { EventDrawerPanel, EventFacets, EventsTable, type EventsAddress } from "./events"

/** A live list asks the router to draw it again, which a test has no router for. */
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }))

const home = pageFixture("home", "Welcome", 3)
const [, heading] = elementIdsOf(home)

if (heading === undefined) throw new Error("the fixture has a heading")

const VIEW = "a".repeat(32)
const naming = namingOf([{ tree: home, receivedAt: 0 }])

const batch = (seq: number, signals: readonly ReaderSignal[], view: string | null = VIEW) =>
  ({
    seq,
    treeId: home.treeId,
    revision: 3,
    sentAt: 0,
    receivedAt: "2026-11-05T09:30:00.000Z",
    audienceId: "aud_everyone",
    view: view ?? undefined,
    signals,
  }) as ReceivedBatch

const pressed = { kind: "activated", nodeId: heading, type: "loom.heading", at: 0 } as ReaderSignal
const dwelled = {
  kind: "dwelled",
  nodeId: heading,
  type: "loom.heading",
  ms: 2_500,
} as ReaderSignal

const events = eventsOf([batch(1, [dwelled]), batch(2, [pressed])])

const firstOf = (list: readonly ReaderEvent[]): ReaderEvent => {
  const [first] = list

  if (first === undefined) throw new Error("an event")

  return first
}

const NOW = Date.parse("2026-11-05T15:00:00.000Z")

const address: EventsAddress = {
  base: "/portal/prj_a/signals",
  filter: {
    kind: "activated",
    page: undefined,
    view: undefined,
    search: undefined,
    live: false,
    range: "24h",
  },
  place: undefined,
}

const page = (overrides: Partial<EventPage> = {}): EventPage => ({
  events,
  older: undefined,
  newer: undefined,
  searched: undefined,
  ...overrides,
})

describe("Events", () => {
  it("lists each event by what happened, on which page and part, linking to its drawer", () => {
    render(
      <EventsTable page={page()} address={address} naming={naming} open={undefined} now={NOW} />
    )

    const rows = screen.getAllByRole("row").slice(1)

    expect(rows).toHaveLength(2)
    expect(within(rows[0] as HTMLElement).getByText("Pressed something")).toBeTruthy()
    expect(within(rows[0] as HTMLElement).getByText("Welcome")).toBeTruthy()
    expect(within(rows[1] as HTMLElement).getByText(/2\.5 seconds/)).toBeTruthy()
    expect(
      within(rows[0] as HTMLElement)
        .getByRole("link")
        .getAttribute("href")
    ).toBe("/portal/prj_a/signals?kind=activated&event=2.0")
  })

  it("pages older and a page newer, with the filter kept", () => {
    render(
      <EventsTable
        page={page({ older: { seq: 1, index: 0 }, newer: { seq: 2, index: 0 } })}
        address={{ ...address, place: { towards: "older", from: { seq: 3, index: 0 } } }}
        naming={naming}
        open={undefined}
        now={NOW}
      />
    )

    expect(screen.getByRole("link", { name: "Older" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated&before=1.0"
    )
    expect(screen.getByRole("link", { name: "Newer" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated&after=2.0"
    )
  })

  it("keeps the page it is on in the address each event opens", () => {
    render(
      <EventsTable
        page={page()}
        address={{ ...address, place: { towards: "newer", from: { seq: 1, index: 0 } } }}
        naming={naming}
        open={undefined}
        now={NOW}
      />
    )

    expect(
      within(screen.getAllByRole("row")[1] as HTMLElement)
        .getByRole("link")
        .getAttribute("href")
    ).toBe("/portal/prj_a/signals?kind=activated&after=1.0&event=2.0")
  })

  it("says how many events the page shows and the stretch of time they were received in", () => {
    render(
      <EventsTable page={page()} address={address} naming={naming} open={undefined} now={NOW} />
    )

    expect(screen.getByText("2 events · at 09:30 UTC today")).toBeTruthy()
    expect(screen.getByText("Newer").getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByText("Older").getAttribute("aria-disabled")).toBe("true")
  })

  it("says how far back it looked when it stopped before filling a page", () => {
    render(
      <EventsTable
        page={page({
          events: [],
          older: { seq: 5, index: 0 },
          searched: { towards: "older", to: "2026-11-04T08:00:00.000Z" },
        })}
        address={address}
        naming={naming}
        open={undefined}
        now={NOW}
      />
    )

    expect(
      screen.getByText(/Looked through everything received since 4 November 2026/)
    ).toBeTruthy()
    expect(screen.getByText(/Nothing there matches/)).toBeTruthy()
  })

  it("says plainly when nothing kept matches", () => {
    render(
      <EventsTable
        page={page({ events: [] })}
        address={address}
        naming={naming}
        open={undefined}
        now={NOW}
      />
    )

    expect(screen.getByText("Nothing kept matches this filter.")).toBeTruthy()
  })
})

describe("the filter above the list", () => {
  it("offers every kind as a chip, keeping the rest of the filter", () => {
    render(<EventFacets address={address} pages={[{ treeId: home.treeId, name: "Welcome" }]} />)

    const kinds = screen.getByRole("navigation", { name: "Kind" })

    expect(within(kinds).getByRole("link", { name: "All kinds" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals"
    )
    expect(
      within(kinds).getByRole("link", { name: "Pressed something" }).getAttribute("aria-current")
    ).toBe("true")
    expect(within(kinds).getAllByRole("link")).toHaveLength(6)
    expect(screen.getByRole("option", { name: "Welcome" })).toBeTruthy()
  })

  it("says when it shows one page view, with the way back to all of them", () => {
    render(
      <EventFacets address={{ ...address, filter: { ...address.filter, view: VIEW } }} pages={[]} />
    )

    expect(screen.getByRole("link", { name: "Show every page view" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated"
    )
  })

  it("searches the part and the page in the same form as the page picker", () => {
    render(
      <EventFacets
        address={{ ...address, filter: { ...address.filter, search: "sign up" } }}
        pages={[]}
      />
    )

    const search = screen.getByRole("searchbox", { name: "Find" })

    expect(search.getAttribute("name")).toBe("q")
    expect((search as HTMLInputElement).defaultValue).toBe("sign up")
    expect(search.closest("form")).toBe(
      screen.getByRole("combobox", { name: "Page" }).closest("form")
    )
    expect(screen.getByText(/Showing what mentions “sign up” in its part or page/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Clear the search" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated"
    )
  })

  it("keeps the search on every kind chip", () => {
    render(
      <EventFacets
        address={{ ...address, filter: { ...address.filter, search: "cta" } }}
        pages={[]}
      />
    )

    const kinds = screen.getByRole("navigation", { name: "Kind" })

    expect(within(kinds).getByRole("link", { name: "All kinds" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?q=cta"
    )
  })
})

describe("the Live switch", () => {
  const live = { ...address, filter: { ...address.filter, live: true } }

  it("is off by default, and switching it on keeps the filter", () => {
    render(<EventFacets address={address} pages={[]} />)

    const toggle = screen.getByRole("switch", { name: "Live" })

    expect(toggle.getAttribute("aria-checked")).toBe("false")
    expect(toggle.getAttribute("href")).toBe("/portal/prj_a/signals?kind=activated&live=on")
    expect(screen.getByText("Switch on to see new events as they arrive.")).toBeTruthy()
  })

  it("says that switching on from an older page goes back to the newest", () => {
    render(
      <EventFacets
        address={{ ...address, place: { towards: "older", from: { seq: 4, index: 1 } } }}
        pages={[]}
      />
    )

    expect(screen.getByRole("switch", { name: "Live" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated&live=on"
    )
    expect(screen.getByText("Switching on goes back to the newest events.")).toBeTruthy()
  })

  it("while on, says so, switches off to the same filter, and stays on through the form", () => {
    const { container } = render(<EventFacets address={live} pages={[]} />)

    const toggle = screen.getByRole("switch", { name: "Live" })

    expect(toggle.getAttribute("aria-checked")).toBe("true")
    expect(toggle.getAttribute("href")).toBe("/portal/prj_a/signals?kind=activated")
    expect(screen.getByText("New events appear at the top as they arrive.")).toBeTruthy()
    expect(
      container.querySelector('input[type="hidden"][name="live"]')?.getAttribute("value")
    ).toBe("on")
  })

  it("stays on across the kind chips", () => {
    render(<EventFacets address={live} pages={[]} />)

    const kinds = screen.getByRole("navigation", { name: "Kind" })

    expect(within(kinds).getByRole("link", { name: "All kinds" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?live=on"
    )
  })
})

describe("the drawer for one event", () => {
  const opened = {
    event: firstOf(events),
    pageView: [...events].reverse(),
    whole: true,
  }

  it("says what happened in words, with the goals it counts toward", () => {
    render(
      <EventDrawerPanel
        opened={opened}
        goals={["Starts"]}
        naming={naming}
        address={address}
        projectId="prj_a"
      />
    )

    const panel = screen.getByRole("complementary", { name: "One event" })

    expect(
      within(panel).getByText("A reader pressed the heading “Welcome” on Welcome.")
    ).toBeTruthy()
    expect(within(panel).getByText("Goal: Starts")).toBeTruthy()
    expect(within(panel).getByText("Everyone")).toBeTruthy()
    expect(within(panel).getByText(VIEW)).toBeTruthy()
  })

  it("lists the rest of its page view, this one marked and the others linked", () => {
    render(
      <EventDrawerPanel
        opened={opened}
        goals={[]}
        naming={naming}
        address={address}
        projectId="prj_a"
      />
    )

    const items = within(screen.getByRole("list")).getAllByRole("listitem")

    expect(items).toHaveLength(2)
    expect(
      within(items[0] as HTMLElement)
        .getByRole("link")
        .getAttribute("href")
    ).toBe("/portal/prj_a/signals?kind=activated&event=1.0")
    expect(items[1]?.getAttribute("aria-current")).toBe("true")
  })

  it("links to the page, to this page view's events, and closes back to the list", () => {
    render(
      <EventDrawerPanel
        opened={opened}
        goals={[]}
        naming={naming}
        address={{ ...address, place: { towards: "older", from: { seq: 9, index: 0 } } }}
        projectId="prj_a"
      />
    )

    expect(screen.getByRole("link", { name: "Open the page" }).getAttribute("href")).toBe(
      `/portal/prj_a/pages/${home.treeId}`
    )
    expect(screen.getByRole("link", { name: "Events from this view" }).getAttribute("href")).toBe(
      `/portal/prj_a/signals?view=${VIEW}`
    )
    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?kind=activated&before=9.0"
    )
  })

  it("says where a page view may run past what it looked through", () => {
    render(
      <EventDrawerPanel
        opened={{ ...opened, whole: false }}
        goals={[]}
        naming={naming}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.getByText(/a long page view may have more/)).toBeTruthy()
  })

  it("says a delivery with no page view ties to nothing, and offers no view to filter by", () => {
    const alone = firstOf(eventsOf([batch(4, [pressed], null)]))

    render(
      <EventDrawerPanel
        opened={{ event: alone, pageView: [], whole: true }}
        goals={[]}
        naming={naming}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.getByText(/named no page view for this delivery/)).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Events from this view" })).toBeNull()
  })

  it("gives a dwell its length rather than a moment", () => {
    const stay = firstOf(eventsOf([batch(1, [dwelled])]))

    render(
      <EventDrawerPanel
        opened={{ event: stay, pageView: [stay], whole: true }}
        goals={[]}
        naming={naming}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.getByText("Stayed 2.5 seconds")).toBeTruthy()
  })
})
