import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  byPageListOf,
  cursorOf,
  type ByPageRow,
  type GoalInDrawer,
  type GoalOnPage,
  type KindBar,
  type PageDrawer,
} from "@/app/(portal)/_lib/by-page"
import type { PageStops } from "@/app/(portal)/_lib/page-stops"

import { ByPageTable, PageDrawerPanel } from "./by-page"

const row = (treeId: string, overrides: Partial<ByPageRow> = {}): ByPageRow => ({
  treeId,
  name: undefined,
  published: true,
  liveVersion: 2,
  opened: 1_234,
  lastMoved: "2026-11-05T10:00:00.000Z",
  mostPressed: undefined,
  waiting: 0,
  primaryGoal: undefined,
  ...overrides,
})

const NOW = Date.parse("2026-11-05T15:00:00.000Z")

const UNOPENED: PageStops = { kind: "unopened", version: 2 }

const address = {
  base: "/portal/prj_a/signals/pages",
  from: undefined,
  segment: undefined,
  range: "24h" as const,
}

describe("By page", () => {
  it("shows each page by its published name with its id, and by its id alone otherwise", () => {
    render(
      <ByPageTable
        list={byPageListOf([row("t_home", { name: "Welcome" }), row("t_bare")], undefined)}
        address={address}
        open={undefined}
        primaryGoal={undefined}
        now={NOW}
      />
    )

    expect(screen.getByRole("link", { name: /Welcome/ }).getAttribute("href")).toBe(
      "/portal/prj_a/signals/pages?page=t_home"
    )
    expect(screen.getByText("t_home")).toBeTruthy()
    expect(screen.getByRole("link", { name: "t_bare" })).toBeTruthy()
  })

  it("says what was pressed most, and plainly when nothing was", () => {
    render(
      <ByPageTable
        list={byPageListOf(
          [
            row("t_a", {
              mostPressed: {
                nodeId: "n_cta",
                name: "the button “Start”",
                presses: 3,
              },
            }),
            row("t_b"),
          ],
          undefined
        )}
        address={address}
        open={undefined}
        primaryGoal={undefined}
        now={NOW}
      />
    )

    expect(screen.getByText("the button “Start”")).toBeTruthy()
    expect(screen.getByText("Nothing pressed")).toBeTruthy()
  })

  it("marks a page with changes waiting, and not one without", () => {
    render(
      <ByPageTable
        list={byPageListOf([row("t_a", { waiting: 2 }), row("t_b")], undefined)}
        address={address}
        open={undefined}
        primaryGoal={undefined}
        now={NOW}
      />
    )

    expect(screen.getAllByText(/waiting/)).toHaveLength(1)
    expect(screen.getByText("2 waiting")).toBeTruthy()
  })

  it("draws the primary goal's rate on each page it covers, and no column without one", () => {
    const signUps: GoalOnPage = {
      goalId: "g_a",
      name: "Sign-ups",
      kind: "activated",
      primary: true,
      reading: { count: 7, pageViews: 200 },
    }
    const list = byPageListOf(
      [
        row("t_a", { primaryGoal: signUps }),
        row("t_b"),
        row("t_c", { primaryGoal: { ...signUps, reading: { count: 0, pageViews: 0 } } }),
      ],
      undefined
    )
    const { unmount } = render(
      <ByPageTable
        list={list}
        address={address}
        open={undefined}
        primaryGoal="Sign-ups"
        now={NOW}
      />
    )

    expect(screen.getByRole("columnheader", { name: /Sign-ups/ }).textContent).toBe(
      "Sign-upsper 100 page views"
    )
    expect(screen.getByText("3.5").getAttribute("title")).toBe(
      "7 presses in 200 page views, 3.5 per 100."
    )
    expect(screen.getByText("Not on this page")).toBeTruthy()
    expect(screen.getByText("Nothing counted")).toBeTruthy()

    unmount()
    render(
      <ByPageTable
        list={list}
        address={address}
        open={undefined}
        primaryGoal={undefined}
        now={NOW}
      />
    )

    expect(screen.queryByText("Not on this page")).toBeNull()
    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
  })

  it("says which rows it shows and links to the older ones, keeping the drawer's page out", () => {
    const rows = Array.from({ length: 60 }, (_, index) =>
      row(`t_${String(index).padStart(2, "0")}`, {
        lastMoved: new Date(Date.UTC(2026, 10, 5, 12) - index * 60_000).toISOString(),
      })
    )

    render(
      <ByPageTable
        list={byPageListOf(rows, undefined)}
        address={address}
        open="t_00"
        primaryGoal={undefined}
        now={NOW}
      />
    )

    expect(screen.getByText("1–50 of 60 · 11:11 to 12:00 UTC today")).toBeTruthy()
    expect(screen.getByText("Newer").getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByRole("link", { name: "Older" }).getAttribute("href")).toBe(
      `/portal/prj_a/signals/pages?from=${cursorOf(rows[50] as ByPageRow)}`
    )
  })
})

describe("the drawer for one page", () => {
  const bar = (label: string, count: number): KindBar => ({
    label,
    meaning: "",
    technical: label,
    count,
    share: 1,
  })
  const drawer: PageDrawer = {
    row: row("t_home", { name: "Welcome", waiting: 1 }),
    range: { kind: "unreadable" },
    bars: [bar("Opened the page", 10)],
    pressed: [{ nodeId: "n_cta", name: "the button “Start”", presses: 1 }],
    longest: { nodeId: "n_intro", name: undefined, seconds: 4.5 },
    goals: [],
  }

  it("says what readers did, what they pressed and what they kept on screen", () => {
    render(<PageDrawerPanel stops={UNOPENED} drawer={drawer} address={address} projectId="prj_a" />)

    const panel = screen.getByRole("complementary", { name: "One page" })

    expect(within(panel).getByText("Opened the page")).toBeTruthy()
    expect(within(panel).getByText("1 press")).toBeTruthy()
    expect(panel.textContent).toContain(
      "Readers kept n_intro on screen longest, for 4.5 seconds on average, since this page was first counted."
    )
  })

  const section = () => {
    const heading = screen.getByRole("heading", { name: /What readers did/ })

    if (heading.parentElement === null) throw new Error("the section holds its heading")

    return { heading, body: heading.parentElement }
  }

  it("draws what readers did over the range, with since the page was first counted one click away", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{
          ...drawer,
          range: { kind: "read", bars: [bar("Pressed something", 4)], countedFrom: undefined },
        }}
        address={{ ...address, range: "7d" }}
        projectId="prj_a"
      />
    )

    const { heading, body } = section()

    expect(heading.textContent).toBe("What readers did, last 7 days")
    expect(within(body).getByText("4")).toBeTruthy()
    expect(
      within(body).getByText("Since this page was first counted, across every version")
    ).toBeTruthy()
    expect(within(body).getByText("10")).toBeTruthy()
  })

  it("says where counting by the hour began when it began inside the range", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{
          ...drawer,
          range: {
            kind: "read",
            bars: [bar("Pressed something", 4)],
            countedFrom: Date.UTC(2026, 10, 8, 9),
          },
        }}
        address={address}
        projectId="prj_a"
      />
    )

    expect(section().body.textContent).toMatch(
      /Counted by the hour from .+, so these start there\./
    )
  })

  it("falls back to since the page was first counted, and says why, where the hours give nothing", () => {
    const { unmount } = render(
      <PageDrawerPanel stops={UNOPENED} drawer={drawer} address={address} projectId="prj_a" />
    )

    expect(section().heading.textContent).toBe(
      "What readers did, since this page was first counted"
    )
    expect(
      screen.getByText(
        "This page's figures by the hour could not be read just now, so these are since it was first counted."
      )
    ).toBeTruthy()

    unmount()
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{ ...drawer, range: { kind: "uncounted" } }}
        address={address}
        projectId="prj_a"
      />
    )

    expect(
      screen.getByText(
        "Nothing has been counted by the hour on this page yet, so these are since it was first counted."
      )
    ).toBeTruthy()
  })

  const HOUR = 3_600_000
  const FROM = Date.UTC(2026, 10, 7, 12)
  const signUps: GoalInDrawer = {
    goalId: "g_a",
    name: "Sign-ups",
    kind: "activated",
    primary: true,
    reading: { count: 7, pageViews: 200 },
    range: {
      kind: "read",
      current: { range: { from: FROM, to: FROM + 24 * HOUR }, views: 100, count: 3 },
      before: { range: { from: FROM - 24 * HOUR, to: FROM }, views: 100, count: 2 },
      clipped: false,
    },
  }

  it("names each goal covering the page with its rate here over the range and since counting began, the primary marked", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{
          ...drawer,
          goals: [
            signUps,
            {
              goalId: "g_b",
              name: "Contact",
              kind: "completed",
              primary: false,
              reading: { count: 1, pageViews: 200 },
              range: undefined,
            },
          ],
        }}
        address={address}
        projectId="prj_a"
      />
    )

    const goals = screen.getByRole("heading", { name: "Goals on this page" }).parentElement

    if (goals === null) throw new Error("the section holds its heading")

    expect(within(goals).getByText("Goal: Sign-ups")).toBeTruthy()
    expect(within(goals).getAllByText("Primary")).toHaveLength(1)
    expect(within(goals).getByText("3 per 100")).toBeTruthy()
    expect(
      within(goals).getByText(
        "Sign-ups: 3 presses in 100 page views, 3 per 100. Up 50% on the 24 hours before (2 per 100)."
      )
    ).toBeTruthy()
    expect(
      within(goals).getByText("Since counting began: 7 presses in 200 page views, 3.5 per 100.")
    ).toBeTruthy()
    expect(
      within(goals).getByText("Its figures for the last 24 hours could not be read just now.")
    ).toBeTruthy()
    expect(
      within(goals).getByText("Since counting began: 1 form sent in 200 page views, 0.5 per 100.")
    ).toBeTruthy()
  })

  it("says a goal had no page views on this page, not on the pages it covers", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{
          ...drawer,
          goals: [
            {
              ...signUps,
              range: {
                kind: "read",
                current: { range: { from: FROM, to: FROM + 24 * HOUR }, views: 0, count: 0 },
                before: undefined,
                clipped: false,
              },
            },
          ],
        }}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.getByText("Sign-ups: no page views on this page.")).toBeTruthy()
  })

  it("says plainly when no goal covers the page, and when goals could not be read", () => {
    const { unmount } = render(
      <PageDrawerPanel stops={UNOPENED} drawer={drawer} address={address} projectId="prj_a" />
    )

    expect(screen.getByText(/No goal covers this page/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Goals" }).getAttribute("href")).toBe(
      "/portal/prj_a/goals"
    )

    unmount()
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{ ...drawer, goals: undefined }}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.getByText("This deployment could not read its goals just now.")).toBeTruthy()
  })

  it("links to what waits on the page's own tab, to the page, its history and its events, and closes back to the list", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={drawer}
        address={{ ...address, range: "30d" }}
        projectId="prj_a"
      />
    )

    expect(
      screen
        .getByRole("link", { name: "1 change for this page waits for review." })
        .getAttribute("href")
    ).toBe("/portal/prj_a/pages/t_home/review")
    expect(screen.getByRole("link", { name: "Open the page" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home"
    )
    expect(screen.getByRole("link", { name: "Page history" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home/history"
    )
    expect(screen.getByRole("link", { name: "Events on this page" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?on=t_home&range=30d"
    )
    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals/pages?range=30d"
    )
  })

  it("keeps the segment on the page's events and on the way back to the list", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={drawer}
        address={{ ...address, segment: "phone" }}
        projectId="prj_a"
      />
    )

    expect(screen.getByRole("link", { name: "Events on this page" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?on=t_home&segment=phone"
    )
    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals/pages?segment=phone"
    )
  })

  it("offers no screen of the page's own where the site has not published it, and still its events", () => {
    render(
      <PageDrawerPanel
        stops={UNOPENED}
        drawer={{ ...drawer, row: row("t_draft", { published: false }) }}
        address={address}
        projectId="prj_a"
      />
    )

    expect(screen.queryByRole("link", { name: "Open the page" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Page history" })).toBeNull()
    expect(
      screen.getByText("The site has not published this page, so it has no screens of its own yet.")
    ).toBeTruthy()
    expect(screen.getByRole("link", { name: "Events on this page" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?on=t_draft"
    )
  })
})

describe("Where readers stopped", () => {
  const address = {
    base: "/portal/prj_a/signals/pages",
    from: undefined,
    segment: undefined,
    range: "24h" as const,
  }
  const drawer: PageDrawer = {
    row: row("t_home", { name: "Welcome" }),
    range: { kind: "unreadable" },
    bars: [],
    pressed: [],
    longest: undefined,
    goals: [],
  }
  const READ: PageStops = {
    kind: "read",
    version: 3,
    views: 120,
    parts: 40,
    unseen: 20,
    places: 2,
    costliest: [
      { nodeId: "n_pricing", name: "the band “Pricing”", unseen: 19 },
      { nodeId: "n_note", name: undefined, unseen: 1 },
    ],
    words: ["Pricing", "Pay as you go"],
    notReporting: [],
  }
  const section = (stops: PageStops) => {
    render(<PageDrawerPanel stops={stops} drawer={drawer} address={address} projectId="prj_a" />)

    const heading = screen.getByRole("heading", { name: "Where readers stopped" })
    const found = heading.closest("section")

    if (found === null) throw new Error("the heading sits in a section")

    return found
  }

  it("says how many places reading stopped and what they cost, the costliest first", () => {
    const part = section(READ)

    expect(part.textContent).toContain(
      "On version 3, over 120 page views since it was first counted, reading stopped in 2 places, and 20 of its 40 parts went unreached."
    )
    expect(
      within(part)
        .getAllByRole("listitem")
        .slice(0, 2)
        .map((item) => item.textContent)
    ).toEqual(["the band “Pricing” n_pricing 19 parts unreached", "n_note 1 part unreached"])
  })

  it("keeps the words nobody reached one click away, counted", () => {
    const part = section(READ)

    expect(within(part).getByText("The words nobody reached (5 words)")).toBeTruthy()
    expect(within(part).getByText("Pay as you go")).toBeTruthy()
  })

  it("names parts on a reader's screen that did not say so apart from the places readers stopped", () => {
    const part = section({ ...READ, notReporting: [{ nodeId: "n_band", name: undefined }] })

    expect(part.textContent).toContain(
      "1 part was on a reader's screen without saying so, so it is not counted as a place readers stopped: n_band."
    )
  })

  it("says plainly when no part went unreached", () => {
    const part = section({ ...READ, places: 0, unseen: 0, costliest: [], words: [] })

    expect(part.textContent).toContain(
      "No part of version 3 went unreached, over 120 page views since it was first counted."
    )
    expect(within(part).queryByRole("list")).toBeNull()
  })

  it.each([
    [
      { kind: "unpublished" },
      "The site has not published this page, so there is no version to read where readers stopped against.",
    ],
    [{ kind: "unreadable" }, "Where readers stopped could not be read just now."],
    [
      { kind: "two-forms" },
      "This page is served in more than one form, and the readers of each stop in different places, so no one answer is drawn.",
    ],
    [
      { kind: "mismatched", orphaned: 2 },
      "Readers were counted on 2 parts this version does not have, so the counts and the page do not belong together and nothing is drawn rather than something wrong.",
    ],
    [{ kind: "unopened", version: 2 }, "No page view of version 2 has been counted yet."],
  ] satisfies readonly (readonly [PageStops, string])[])(
    "says why nothing is drawn: %o",
    (stops, sentence) => {
      const part = section(stops)

      expect(part.textContent).toContain(sentence)
      expect(within(part).queryByRole("list")).toBeNull()
    }
  )
})
