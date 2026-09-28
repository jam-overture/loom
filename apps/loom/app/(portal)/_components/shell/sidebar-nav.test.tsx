import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/portal/activity" }))

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
    expect(current[0]?.getAttribute("href")).toBe("/portal/activity")
    expect(current[0]?.getAttribute("aria-current")).toBe("page")
  })

  it("renders every route as a real link, so the rail is tabbable at all", () => {
    render(<SidebarNav />)

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//)
    }
  })

  /**
   * **A rail navigated with the pointer gives the focus back.**
   *
   * The rail widens on `focus-within` as well as on hover, and a link keeps
   * focus after it is clicked — so it stayed open after the pointer had left and
   * the only way to close it was to click elsewhere. Worse on a touch screen,
   * where there is no pointer to leave and nothing takes the focus away.
   */
  it("gives the focus back when a link is pressed with a pointer", () => {
    render(<SidebarNav />)
    const link = screen.getByRole("link", { name: /Pages/ })

    link.focus()
    expect(document.activeElement).toBe(link)

    /** A real press carries its click count; this is what tells it from a key. */
    fireEvent.click(link, { detail: 1 })

    expect(document.activeElement).not.toBe(link)
  })

  /**
   * And keeps it for a keyboard, which is the case `focus-within` exists for.
   * Taking focus off the link a keyboard user just activated would drop them at
   * the top of the document and collapse the rail they are reading.
   */
  it("keeps the focus when a link is activated from the keyboard", () => {
    render(<SidebarNav />)
    const link = screen.getByRole("link", { name: /Pages/ })

    link.focus()

    /** Enter and Space on a focused link fire a click whose detail is 0. */
    fireEvent.click(link, { detail: 0 })

    expect(document.activeElement).toBe(link)
  })
})
