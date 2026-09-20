import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RailHeader } from "./rail-header"

/**
 * Four lines of copy that were, until this file existed, in `page.tsx` — the
 * one file in this lane a test cannot reach. Three runs have made decisions
 * about them and none of the three could assert one.
 *
 * What is tested is each line's *job*, because every one of them is a sentence
 * of copy away from quietly going again, and because the only thing a render
 * test of static markup is good for is holding the claims the markup was
 * written to make.
 */
describe("the rail's header", () => {
  /**
   * The first thing a stranger has to be able to rule out is a recording. The
   * revision counter in the bar is the proof; this is the word.
   */
  it("says the thing beside it is live", () => {
    render(<RailHeader />)

    expect(screen.getByText(/live demo/i)).toBeTruthy()
  })

  /**
   * "Ask *that* page", never "this page". The specimen is a clinic's page and
   * the rail is Loom's, so "this page" is the one question a stranger must not
   * have to ask — and the heading was pointing at the wrong thing for as long
   * as the specimen was Loom's own marketing page.
   *
   * At the size of a claim, too: the heading it replaced was 18px, set smaller
   * than the specimen's body copy, so the sentence saying what this surface is
   * for was the least prominent sentence on the screen.
   */
  it("points at the page rather than at itself, and does it in the document's one heading", () => {
    const { container } = render(<RailHeader />)

    const heading = screen.getByRole("heading", { level: 1 })

    expect(heading.textContent).toContain("that page")
    expect(heading.textContent).not.toContain("this page")
    expect(container.querySelectorAll("h1")).toHaveLength(1)
  })

  /**
   * The one thing a stranger can otherwise get wrong about the stage, and the
   * half the bar above does not cover: it is data, not a picture of a page.
   */
  it("says the stage is data rather than a screenshot", () => {
    render(<RailHeader />)

    expect(screen.getByText(/isn’t a picture/i).textContent).toContain("rewrite")
  })

  /**
   * The referent for "that page", and it is needed only where the page is not
   * beside you. `lg:hidden` is the whole of what makes it narrow-only, so it is
   * asserted rather than assumed: without it the sentence would be a lie on the
   * layout where the page is to the left.
   */
  it("supplies the referent only where the page is underneath", () => {
    render(<RailHeader />)

    const referent = screen.getByText(/it’s the page below/i)

    expect(referent.className).toContain("lg:hidden")
  })

  /**
   * **The instruction is gone and this is the assertion that keeps it gone.**
   *
   * It used to read *"It's the page below. Press something, then look for the
   * mark Loom leaves on it."* — telling a visitor on a 6,380px document to go
   * hunting for something the surface brings them to on its own. Measured at
   * 390 × 844: the ask scrolls the document to the card, which renders the part
   * in question inside itself, and answering scrolls it to the mark with
   * `BackToTheRecord` pinned under it. Nothing is hunted for.
   *
   * It cost two lines at the top of the one screen that has none to spare, so
   * the failure this guards against is not a wrong word — it is two lines of
   * the arrival screen coming back for an instruction that is not true.
   */
  it("does not send a visitor looking for the mark themselves", () => {
    const { container } = render(<RailHeader />)

    const said = container.textContent ?? ""

    expect(said).not.toMatch(/look for the mark/i)
    expect(said).not.toMatch(/press something/i)
  })
})
