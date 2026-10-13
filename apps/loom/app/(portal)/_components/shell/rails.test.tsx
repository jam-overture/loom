import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SECTIONS, sectionItems } from "./sections"

let pathname = "/portal"

vi.mock("next/navigation", () => ({ usePathname: () => pathname }))

const { Rails } = await import("./rails")

/**
 * The regression this file exists for is one word long: **at rest**.
 *
 * The rail this replaces had every label written, named in a comment, and
 * asserted by a test — and showed none of them until a pointer or a focus ring
 * arrived, because each label carried `opacity-0` with a
 * `group-hover:opacity-100` beside it. The test that guarded them asserted the
 * *reveal*, which is exactly the shape of test that passes while the screen is
 * unreadable.
 *
 * So the assertions here are about what is on the screen before anybody does
 * anything, and the stronger ones are about the DOM rather than about classes:
 * jsdom computes no layout, so a class assertion cannot prove a label is
 * legible — but `getByRole("link", { name })` can prove the rail says the word
 * at all, and nothing reveals it.
 */
const railFor = (label: string): HTMLElement =>
  screen.getByRole("navigation", { name: label })

describe("the rails", () => {
  beforeEach(() => {
    pathname = "/portal"
  })

  it("writes every section's name beside its glyph, with nothing to reveal first", () => {
    const { container } = render(<Rails />)
    const sections = railFor("Sections")

    for (const section of SECTIONS) {
      expect(within(sections).getByRole("link", { name: section.label })).toBeTruthy()
    }

    /*
     * The mechanism, named so it cannot come back quietly. Every label in the
     * old rail was `opacity-0` until a hover or a focus reached its ancestor,
     * and the three classes below are the whole of how that worked.
     */
    expect(container.innerHTML).not.toContain("opacity-0")
    expect(container.innerHTML).not.toContain("group-hover:")
    expect(container.innerHTML).not.toContain("group-focus-within:")
  })

  it("renders every section as a real link, so the rail is tabbable at all", () => {
    render(<Rails />)

    const links = within(railFor("Sections")).getAllByRole("link")

    expect(links).toHaveLength(SECTIONS.length)
    for (const link of links) expect(link.getAttribute("href")).toMatch(/^\/portal/u)
  })

  /**
   * A section's screens are on the screen, not behind a press.
   *
   * This is the second rail the maintainer asked for — *"There should be a
   * second left rail that can act as a submenu"* — and the seven tabs on the
   * page inspector were all standing in for it.
   */
  it("opens the section's own screens beside it, grouped and named", () => {
    pathname = "/portal/activity"

    render(<Rails />)

    const logs = SECTIONS.find((section) => section.key === "logs")!
    const second = railFor("Logs screens")

    for (const item of sectionItems(logs)) {
      expect(within(second).getByRole("link", { name: item.label })).toBeTruthy()
    }
    for (const group of logs.groups ?? []) {
      expect(within(second).getByText(group.name)).toBeTruthy()
    }
  })

  /**
   * No submenu of one. `Pieces` is a single screen, and a second rail offering
   * the screen you are already on is a rail that exists to be symmetrical.
   */
  it("draws no second rail for a section that is one screen", () => {
    pathname = "/portal/pieces"

    render(<Rails />)

    expect(screen.getByRole("navigation", { name: "Sections" })).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: /screens$/u })).toBeNull()
  })

  /**
   * Marked for a screen reader and not only in colour, which is the half of an
   * active state that a palette cannot carry.
   *
   * `page` goes to the one link that is the screen being read, and the section
   * holding it gets `true` instead: a reader three levels inside `Pages` is in
   * that section without `/portal/pages` being the page they are on, and a
   * rail claiming otherwise would contradict the heading in front of them.
   */
  it("marks the section it is in, and names the page only where it is the page", () => {
    pathname = "/portal/rules/what-if"

    render(<Rails />)

    const sections = railFor("Sections")

    expect(within(sections).getByRole("link", { name: "Rules" }).getAttribute("aria-current")).toBe(
      "true"
    )

    const second = railFor("Rules screens")
    const current = within(second)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")

    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute("href")).toBe("/portal/rules/what-if")
  })

  it("marks a section that is one screen as the page itself", () => {
    pathname = "/portal/pieces"

    render(<Rails />)

    expect(
      within(railFor("Sections")).getByRole("link", { name: "Pieces" }).getAttribute("aria-current")
    ).toBe("page")
  })

  /**
   * The front door does not claim the portal.
   *
   * `/portal` is the prefix of every path on this surface, so the one thing
   * this rail must never do is light `Overview` everywhere. It was the first
   * defect the one-level rail had and the reason `exact` exists.
   */
  it("lights one section and no more, wherever a reader is", () => {
    for (const path of [
      "/portal",
      "/portal/app",
      "/portal/pages/t_home1",
      "/portal/pieces",
      "/portal/rules/what-if",
      "/portal/history",
      "/portal/checkup/everything",
      "/portal/sign-ins",
    ]) {
      pathname = path

      const { unmount } = render(<Rails />)

      const lit = within(railFor("Sections"))
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") !== null)

      expect(lit, path).toHaveLength(1)

      unmount()
    }
  })

  /**
   * The sign-in page is drawn without the chrome, and the prototype brings its
   * own, so neither is a section. Nothing is lit rather than something wrong.
   */
  it("lights nothing on a path no section claims", () => {
    pathname = "/portal/preview/overture/logs"

    render(<Rails />)

    const lit = within(railFor("Sections"))
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") !== null)

    expect(lit).toEqual([])
    expect(screen.queryByRole("navigation", { name: /screens$/u })).toBeNull()
  })

  /**
   * On a phone both rails lie down above the page.
   *
   * A 64px column beside a 224px column leaves 102 of a 390px screen for the
   * screen, so the rails are rows until `md` and columns after it. It is a
   * class assertion, which is the only kind available without a browser — the
   * photograph at 390px is the real check and it is in the report.
   */
  it("is a row on a phone and a column on a display", () => {
    render(<Rails />)

    const sections = railFor("Sections")

    expect(sections.className).toContain("flex-row")
    expect(sections.className).toContain("md:flex-col")
    expect(sections.className).toContain("md:w-16")
  })
})
