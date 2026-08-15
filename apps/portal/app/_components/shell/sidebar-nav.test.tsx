import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/activity" }))

const { SidebarNav } = await import("./sidebar-nav")

/**
 * The rail is 56px of icons that widens on hover to show its labels. That works
 * for a pointer and, until this run, not at all for a keyboard: the labels were
 * revealed by `group-hover` alone, so tabbing through the rail moved a focus
 * ring across six unlabelled glyphs. Navigable and unreadable at once is worse
 * than either.
 *
 * The fix is a class, so the test is about a class. That is a weak assertion on
 * its own — it cannot prove the label is legible — but it is the part that gets
 * deleted by accident, and jsdom computes no layout to assert anything stronger.
 */
describe("SidebarNav", () => {
  it("reveals its labels on focus as well as on hover", () => {
    const { container } = render(<SidebarNav />)

    const labels = [...container.querySelectorAll("span")]

    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.className).toContain("group-focus-within:opacity-100")
      expect(label.className).toContain("group-hover:opacity-100")
    }
  })

  it("marks the route it is on for a screen reader, not only in colour", () => {
    render(<SidebarNav />)

    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current"))

    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute("href")).toBe("/activity")
    expect(current[0]?.getAttribute("aria-current")).toBe("page")
  })

  it("renders every route as a real link, so the rail is tabbable at all", () => {
    render(<SidebarNav />)

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//)
    }
  })
})
