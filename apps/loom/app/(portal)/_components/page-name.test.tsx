import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { treeIdSchema } from "@loom/runtime"

import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"

import { PageName } from "./page-name"

/**
 * One rule, asserted in both layouts: **both halves, always.**
 *
 * The portal printed only the id for a fortnight. The failure mode of the fix is
 * printing only the name, and it is the worse of the two — an id a reader cannot
 * see is an id they cannot paste into a URL, quote in a support thread, or match
 * against a log line. So every test here checks for both strings rather than for
 * the one that changed.
 */

const treeId = treeIdSchema.parse("t_seed1")

const named: PageNameValue = { name: "Autumn arrivals", treeId, derived: true }
const untitled: PageNameValue = {
  name: "Untitled page",
  treeId,
  derived: false,
}

describe("PageName", () => {
  it("shows the name and the id, stacked, in that order", () => {
    const { container } = render(<PageName page={named} />)
    const text = container.textContent ?? ""

    expect(text).toContain("Autumn arrivals")
    expect(text).toContain("t_seed1")
    expect(text.indexOf("Autumn arrivals")).toBeLessThan(text.indexOf("t_seed1"))
  })

  it("shows the name and the id inline, in that order", () => {
    const { container } = render(<PageName page={named} layout="inline" />)
    const text = container.textContent ?? ""

    expect(text).toContain("Autumn arrivals")
    expect(text).toContain("t_seed1")
    expect(text.indexOf("Autumn arrivals")).toBeLessThan(text.indexOf("t_seed1"))
  })

  /**
   * A gap between two spans that neither of them carries is the defect this
   * lane found three times in one week — a sentence rendering as
   * `Autumn arrivalst_seed1` passes every `toContain` anybody would write.
   */
  it("keeps a space between the name and the id when they share a line", () => {
    const { container } = render(<PageName page={named} layout="inline" />)

    expect(container.textContent).toBe("Autumn arrivals t_seed1")
  })

  it("still shows the id for a page that has not said what it is called", () => {
    const { container } = render(<PageName page={untitled} />)

    expect(container.textContent).toContain("Untitled page")
    expect(container.textContent).toContain("t_seed1")
  })

  /** The id is a name, not technical detail. It never goes behind a disclosure. */
  it("puts neither half inside a disclosure", () => {
    const { container } = render(<PageName page={named} />)

    expect(container.querySelector("details")).toBeNull()
  })

  it("sets the id in monospace and the name in the reading face", () => {
    const { container } = render(<PageName page={named} />)

    const mono = [...container.querySelectorAll("span")].filter((element) =>
      element.className.includes("font-mono")
    )

    expect(mono).toHaveLength(1)
    expect(mono[0]?.textContent).toBe("t_seed1")
  })

  /**
   * A row is one line high, so a long name is cut by CSS rather than by the
   * derivation — `title` is what keeps the untruncated text reachable without
   * opening the page.
   */
  it("carries the full name where a truncated row can still be read", () => {
    const { container } = render(<PageName page={named} />)

    expect(container.querySelector("[title]")?.getAttribute("title")).toBe("Autumn arrivals")
  })
})
