import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { forReviewLabel, PageTabs } from "./page-tabs"

describe("a page's tabs", () => {
  it("offers the page, its history and its changes for review, marking the one being drawn", () => {
    render(<PageTabs projectId="prj_a" treeId="t_home" current="history" waiting={2} />)

    const links = screen.getAllByRole("link")

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["The page", "/portal/prj_a/pages/t_home"],
      ["Page history", "/portal/prj_a/pages/t_home/history"],
      ["For review (2)", "/portal/prj_a/pages/t_home/review"],
    ])
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null])
  })
})

describe("the For review tab's label", () => {
  it("counts the changes waiting, nought included", () => {
    expect(forReviewLabel(0)).toBe("For review (0)")
    expect(forReviewLabel(3)).toBe("For review (3)")
  })

  it("gives no count where the changes waiting could not be read", () => {
    expect(forReviewLabel(undefined)).toBe("For review")
  })
})
