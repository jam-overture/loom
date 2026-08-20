import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "@loom/runtime"

import { COURSE_THEME_STYLE, courseRegistry, heading, prose, renderFragment } from "./loom"

/**
 * The claim 0067 makes about this surface, checked rather than asserted in a
 * comment: what a reader reads here is a tree of registered primitives.
 */

describe("the course, composed", () => {
  it("renders a question through the registry, not through markup", () => {
    const { container } = render(
      <>{renderFragment((ids) => [prose(ids, "Why is a half-applied delta worse?")], "test")}</>
    )

    const paragraph = container.querySelector("p")

    expect(paragraph?.textContent).toBe("Why is a half-applied delta worse?")
    /** Styled from the theme's custom properties — no colour is named here. */
    expect(paragraph?.getAttribute("style")).toContain("var(--loom-")
  })

  it("keeps a heading's level, since the outline is the document's and not the layout's", () => {
    const { container } = render(<>{renderFragment((ids) => [heading(ids, 2, "Set N")], "test-h")}</>)

    expect(container.querySelector("h2")?.textContent).toBe("Set N")
  })

  it("builds only from primitives the starter registry actually holds", () => {
    for (const type of ["loom.prose", "loom.heading", "loom.stack", "loom.card", "loom.badge"]) {
      expect(courseRegistry.resolve(primitiveTypeSchema.parse(type)), type).toBeDefined()
    }
  })

  it("mounts one theme for the whole surface, in variables rather than colours", () => {
    const variables = Object.keys(COURSE_THEME_STYLE)

    expect(variables).toContain("--loom-fg-default")
    expect(variables).toContain("--loom-bg-canvas")
    expect(variables).toContain("--loom-body-family")
  })
})
