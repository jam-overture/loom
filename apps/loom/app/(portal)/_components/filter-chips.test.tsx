import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FilterChips } from "./filter-chips"

describe("FilterChips", () => {
  it("links each choice with its count and marks the one picked", () => {
    render(
      <FilterChips
        label="Standing"
        choices={[
          { label: "All", count: 3, href: "/portal/prj_a/review", selected: false },
          {
            label: "Stale",
            count: 1,
            href: "/portal/prj_a/review?standing=stale",
            selected: true,
          },
        ]}
      />
    )

    const nav = screen.getByRole("navigation", { name: "Standing" })
    const stale = within(nav).getByRole("link", { name: "Stale 1" })

    expect(stale.getAttribute("href")).toBe("/portal/prj_a/review?standing=stale")
    expect(stale.getAttribute("aria-current")).toBe("true")
    expect(within(nav).getByRole("link", { name: "All 3" }).getAttribute("aria-current")).toBeNull()
  })
  it("leaves the count off a choice that has none", () => {
    render(
      <FilterChips
        label="Kind"
        choices={[{ label: "All kinds", href: "/portal/prj_a/signals", selected: true }]}
      />
    )

    expect(screen.getByRole("link", { name: "All kinds" }).getAttribute("aria-current")).toBe(
      "true"
    )
  })
})
