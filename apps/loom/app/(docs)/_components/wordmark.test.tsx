import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DOCS_HOME, HOME } from "@/app/(docs)/_lib/surfaces"

import { Wordmark } from "./wordmark"

/**
 * The corner mark, and the one thing it must not go back to being: a single
 * link. Either href on its own loses a reading somebody needs — that is the
 * whole of the 24 September finding on one side and the migration's comment on
 * the other — so what is asserted here is that **both** are offered.
 */

const hrefs = (): readonly string[] => {
  const { container } = render(<Wordmark />)

  return [...container.querySelectorAll("a")].map((anchor) => anchor.getAttribute("href") ?? "")
}

describe("the wordmark", () => {
  it("offers the front door", () => {
    expect(hrefs()).toContain(HOME.path)
  })

  it("still offers the first page of the documentation", () => {
    expect(hrefs()).toContain(DOCS_HOME)
  })

  it("is exactly those two, so neither word is decoration", () => {
    expect(hrefs()).toEqual([HOME.path, DOCS_HOME])
  })

  it("names the project and this site, in that order", () => {
    const { container } = render(<Wordmark />)
    const [project, site] = [...container.querySelectorAll("a")]

    expect(project?.textContent).toBe("Loom")
    expect(site?.textContent).toBe("docs")
  })

  /**
   * The separator is punctuation between two links and says nothing a screen
   * reader needs; read out, it turns "Loom, docs" into "Loom slash docs".
   */
  it("hides the separator from a screen reader", () => {
    const { container } = render(<Wordmark />)

    expect(container.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe("/")
  })
})
