import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NotFound from "./not-found"

/**
 * Before this file existed the 404 was Next's own, which is outside the design
 * system and says nothing about why a URL might be refused here. The test that
 * matters is that it explains the *deliberate* case: four pages call
 * `notFound()` on a malformed `tree=` rather than guessing at an identifier, and
 * a reader who hit that needs to know their id was rejected, not that a page is
 * missing.
 */
describe("the not-found page", () => {
  it("explains that a malformed tree id is refused rather than guessed at", () => {
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: "There\u2019s nothing here" })).toBeInstanceOf(
      HTMLElement
    )
    expect(document.body.textContent).toContain("well-formed tree id")
  })

  /**
   * The way out has to be somewhere that exists, which is not a thing worth
   * asserting until it is not true: this named `/portal/pages` and
   * `/portal/activity` until 14 October, and unit 0 had deleted both, so the
   * page a lost reader lands on offered two more 404s. `destinations.test.ts`
   * holds every address in the group against the routes on disk now; this holds
   * the narrower thing, which is that the page offers an exit at all.
   */
  it("offers a way out, because a 404 with no exit is a dead end", () => {
    render(<NotFound />)

    const destinations = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(destinations).toContain("/portal")
  })

  it("does not dress a missing page as a failure", () => {
    const { container } = render(<NotFound />)

    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("empty")
    expect(screen.queryByRole("status")).toBeNull()
  })
})
