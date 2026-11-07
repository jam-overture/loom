import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageTabs } from "./page-tabs"

describe("a page's tabs", () => {
  it("offers the page and its history, marking the one being drawn", () => {
    render(<PageTabs projectId="prj_a" treeId="t_home" current="history" />)

    const links = screen.getAllByRole("link")

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["The page", "/portal/prj_a/pages/t_home"],
      ["Page history", "/portal/prj_a/pages/t_home/history"],
    ])
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page"])
  })
})
