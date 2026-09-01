import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Example } from "./example"

describe("an example on a page", () => {
  it("mounts the tree the catalogue holds", () => {
    const { container } = render(<Example id="first-tree" />)

    expect(container.querySelector("[data-example='first-tree']")).not.toBeNull()
    expect(container.textContent).toContain("Hello from a tree")
  })

  it("shows the tree beside what it rendered", () => {
    const { container } = render(<Example id="first-tree" />)

    expect(container.querySelector("details")?.textContent).toContain("loom.heading")
  })

  it("refuses an id nobody registered", () => {
    expect(() => render(<Example id="not-an-example" />)).toThrow(/not-an-example/)
  })

  /*
   * The one class that keeps the documentation site out of its own examples.
   *
   * `globals.css` guards every prose rule with `:not(.not-prose *)`, and
   * `prose-barrier.test.ts` holds that guard — but the guard only reaches a
   * tree because the figure around it carries `not-prose`. Take the class off
   * and every heading in every example goes back to wearing the docs site's
   * letter-spacing, and a level-2 heading goes back to wearing a border this
   * site draws across a tree that never asked for one.
   *
   * That is what happened until 31 August, and what made it survive is that
   * nothing anywhere asserted this class. The examples rendered, the registry's
   * own check passed, and the values were plausible enough to look chosen.
   */
  it("wraps the tree in the region the site's prose rules cannot reach", () => {
    const { container } = render(<Example id="first-tree" />)
    const figure = container.querySelector("[data-example='first-tree']")

    expect(figure?.classList.contains("not-prose")).toBe(true)
  })
})
