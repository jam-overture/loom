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
})
