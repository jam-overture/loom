import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  byPageListOf,
  cursorOf,
  type ByPageRow,
  type PageDrawer,
} from "@/app/(portal)/_lib/by-page"

import { ByPageTable, PageDrawerPanel } from "./by-page"

const row = (treeId: string, overrides: Partial<ByPageRow> = {}): ByPageRow => ({
  treeId,
  name: undefined,
  liveVersion: 2,
  opened: 1_234,
  lastMoved: "2026-11-05T10:00:00.000Z",
  mostPressed: undefined,
  waiting: 0,
  ...overrides,
})

const address = { base: "/portal/prj_a/signals/pages", from: undefined }

describe("By page", () => {
  it("shows each page by its published name with its id, and by its id alone otherwise", () => {
    render(
      <ByPageTable
        list={byPageListOf([row("t_home", { name: "Welcome" }), row("t_bare")], undefined)}
        address={address}
        open={undefined}
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
      />
    )

    expect(screen.getAllByText(/waiting/)).toHaveLength(1)
    expect(screen.getByText("2 waiting")).toBeTruthy()
  })

  it("says which rows it shows and links to the older ones, keeping the drawer's page out", () => {
    const rows = Array.from({ length: 60 }, (_, index) =>
      row(`t_${String(index).padStart(2, "0")}`, {
        lastMoved: new Date(Date.UTC(2026, 10, 5, 12) - index * 60_000).toISOString(),
      })
    )

    render(<ByPageTable list={byPageListOf(rows, undefined)} address={address} open="t_00" />)

    expect(screen.getByText("1–50 of 60")).toBeTruthy()
    expect(screen.getByText("Newer").getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByRole("link", { name: "Older" }).getAttribute("href")).toBe(
      `/portal/prj_a/signals/pages?from=${cursorOf(rows[50] as ByPageRow)}`
    )
  })
})

describe("the drawer for one page", () => {
  const drawer: PageDrawer = {
    row: row("t_home", { name: "Welcome", waiting: 1 }),
    bars: [
      {
        label: "Opened the page",
        meaning: "",
        technical: "viewed",
        count: 10,
        share: 1,
      },
    ],
    pressed: [{ nodeId: "n_cta", name: "the button “Start”", presses: 1 }],
    longest: { nodeId: "n_intro", name: undefined, seconds: 4.5 },
  }

  it("says what readers did, what they pressed and what they kept on screen", () => {
    render(<PageDrawerPanel drawer={drawer} address={address} projectId="prj_a" />)

    const panel = screen.getByRole("complementary", { name: "One page" })

    expect(within(panel).getByText("Opened the page")).toBeTruthy()
    expect(within(panel).getByText("1 press")).toBeTruthy()
    expect(panel.textContent).toContain(
      "Readers kept n_intro on screen longest, for 4.5 seconds on average."
    )
  })

  it("links to what waits for the page, to the page and its events, and closes back to the list", () => {
    render(<PageDrawerPanel drawer={drawer} address={address} projectId="prj_a" />)

    expect(
      screen
        .getByRole("link", { name: "1 change for this page waits for review." })
        .getAttribute("href")
    ).toBe("/portal/prj_a/review")
    expect(screen.getByRole("link", { name: "Open the page" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home"
    )
    expect(screen.getByRole("link", { name: "Events on this page" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?on=t_home"
    )
    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals/pages"
    )
  })
})
