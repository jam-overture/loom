import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Compared } from "@/app/(portal)/_lib/compare-reading"

import { ComparePanel } from "./compare-panel"

const DRAWN: Compared = {
  kind: "drawn",
  comparison: {
    summary: "1 part added, 1 part taken off.",
    before: [
      { nodeId: "n_banner", name: "the banner", depth: 0, mark: "removed" },
      { nodeId: "n_heading", name: "the heading “Welcome”", depth: 0, mark: undefined },
    ],
    after: [
      { nodeId: "n_heading", name: "the heading “Welcome”", depth: 0, mark: undefined },
      { nodeId: "n_offer", name: "the text “Free trial”", depth: 1, mark: "added" },
    ],
  },
}

const panel = (compared: Compared) =>
  render(
    <ComparePanel
      heading="Version 3: Removes the banner."
      compared={compared}
      close="/portal/prj_a/pages/t_home/history"
      timeline="/portal/prj_a/review/accepted/p_1"
    />
  )

describe("Compare on a page's history", () => {
  it("draws the page before and after side by side, saying what happened to each part marked", () => {
    panel(DRAWN)

    const before = screen.getByRole("region", { name: "Before" })
    const after = screen.getByRole("region", { name: "After" })

    expect(screen.getByText("1 part added, 1 part taken off.")).toBeDefined()
    expect(within(before).getByText("taken off")).toBeDefined()
    expect(within(before).queryByText("added")).toBeNull()
    expect(within(after).getByText("added")).toBeDefined()
    expect(within(after).getByText("the text “Free trial”").getAttribute("title")).toBe("n_offer")
  })

  it("closes back to the history and links to the change's timeline", () => {
    panel(DRAWN)

    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home/history"
    )
    expect(screen.getByRole("link", { name: "Follow it from Accept" }).getAttribute("href")).toBe(
      "/portal/prj_a/review/accepted/p_1"
    )
  })

  it("folds the parts away from any change into a line saying how many", () => {
    const far = ["n_a", "n_b", "n_c"].map((nodeId) => ({
      nodeId,
      name: nodeId,
      depth: 0,
      mark: undefined,
    }))

    panel({
      kind: "drawn",
      comparison: {
        summary: "1 part changed.",
        before: far,
        after: [...far, { nodeId: "n_d", name: "the button", depth: 0, mark: "changed" }],
      },
    })

    expect(
      within(screen.getByRole("region", { name: "Before" })).getByText("3 parts unchanged")
    ).toBeDefined()
    expect(
      within(screen.getByRole("region", { name: "After" })).getByText("2 parts unchanged")
    ).toBeDefined()
  })

  it("says why a change cannot be drawn instead of drawing a guess", () => {
    panel({ kind: "not-drawn", why: "off-the-page" })

    expect(screen.queryByRole("region", { name: "Before" })).toBeNull()
    expect(screen.getByText(/did not fit your site's newer version/u)).toBeDefined()
  })

  it("says the record could not be read", () => {
    panel({ kind: "unreadable" })

    expect(screen.getByText(/could not be read/u)).toBeDefined()
  })
})
